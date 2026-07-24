"""Research Run FastAPI backend."""
from __future__ import annotations
import asyncio
import io
import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Body
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
import httpx
import pypdf

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from models import Paper, AnalysisResult  # noqa: E402
from agents import (
    AGENTS,
    start_workflow,
    subscribe,
    is_running,
    get_events,
)  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("research-run")

# ---------------------------------------------------------------------------
# Mongo
# ---------------------------------------------------------------------------
mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get("DB_NAME", "research_run")]

papers_col = db.papers
analyses_col = db.analyses

app = FastAPI(title="Research Run")
api = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _strip_mongo(doc: Dict[str, Any]) -> Dict[str, Any]:
    if doc is None:
        return {}
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


async def _get_paper(paper_id: str) -> Dict[str, Any]:
    doc = await papers_col.find_one({"id": paper_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Paper not found")
    return doc


async def _get_analysis(paper_id: str) -> Optional[Dict[str, Any]]:
    return await analyses_col.find_one({"paper_id": paper_id}, {"_id": 0})


def _pdf_to_text(data: bytes) -> Dict[str, Any]:
    reader = pypdf.PdfReader(io.BytesIO(data))
    chunks: List[str] = []
    for p in reader.pages:
        try:
            chunks.append(p.extract_text() or "")
        except Exception:
            chunks.append("")
    text = "\n".join(chunks)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return {"text": text.strip(), "pages": len(reader.pages), "word_count": len(text.split())}


def _guess_title(text: str, fallback: str) -> str:
    for line in text.splitlines()[:20]:
        line = line.strip()
        if 12 < len(line) < 180 and not line.lower().startswith(("abstract", "keywords", "figure", "table")):
            return line
    return fallback


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"service": "Research Run", "status": "ok"}


@api.get("/agents")
async def list_agents():
    return {"agents": AGENTS}


@api.post("/upload")
async def upload_paper(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported")
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty file")
    try:
        parsed = _pdf_to_text(data)
    except Exception as e:
        raise HTTPException(400, f"Failed to parse PDF: {e}")
    if len(parsed["text"]) < 200:
        raise HTTPException(400, "PDF appears empty or is scanned (no extractable text).")

    title = _guess_title(parsed["text"], fallback=file.filename.rsplit(".", 1)[0])
    paper = Paper(
        title=title,
        text=parsed["text"],
        pages=parsed["pages"],
        word_count=parsed["word_count"],
        file_name=file.filename,
        abstract=parsed["text"][:800],
    )
    doc = paper.model_dump()
    await papers_col.insert_one(doc)
    doc.pop("text", None)  # don't return the full text
    doc.pop("_id", None)
    return doc


@api.get("/papers")
async def list_papers():
    docs = await papers_col.find({}, {"_id": 0, "text": 0}).sort("created_at", -1).to_list(500)
    return {"papers": docs}


@api.get("/paper/{paper_id}")
async def get_paper(paper_id: str):
    doc = await _get_paper(paper_id)
    doc.pop("text", None)
    analysis = await _get_analysis(paper_id)
    return {"paper": doc, "analysis": analysis}


@api.get("/paper/{paper_id}/text")
async def get_paper_text(paper_id: str):
    doc = await _get_paper(paper_id)
    return {"text": doc.get("text", "")}


@api.delete("/paper/{paper_id}")
async def delete_paper(paper_id: str):
    await papers_col.delete_one({"id": paper_id})
    await analyses_col.delete_many({"paper_id": paper_id})
    return {"ok": True}


@api.post("/paper/{paper_id}/pin")
async def pin_paper(paper_id: str, body: Dict[str, bool] = Body(...)):
    pinned = bool(body.get("pinned", False))
    await papers_col.update_one({"id": paper_id}, {"$set": {"pinned": pinned}})
    return {"ok": True, "pinned": pinned}


@api.get("/history")
async def history():
    docs = await analyses_col.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"history": docs}


@api.get("/stats")
async def stats():
    total_papers = await papers_col.count_documents({})
    total_analyses = await analyses_col.count_documents({})
    analyses = await analyses_col.find(
        {}, {"_id": 0, "score": 1, "gaps": 1, "keywords": 1, "created_at": 1}
    ).to_list(500)
    gap_count = 0
    keyword_count = 0
    scores: List[float] = []
    novelty_scores: List[float] = []
    for a in analyses:
        gaps = a.get("gaps") or {}
        gap_count += len(gaps.get("gaps", []) or [])
        gap_count += len(gaps.get("open_problems", []) or [])
        kw = a.get("keywords") or {}
        keyword_count += len(kw.get("keywords", []) or [])
        sc = a.get("score") or {}
        if sc.get("paper_score"):
            scores.append(float(sc["paper_score"]))
    avg_score = round(sum(scores) / len(scores), 2) if scores else 0.0
    return {
        "total_papers": total_papers,
        "total_analyses": total_analyses,
        "gaps_found": gap_count,
        "keywords_generated": keyword_count,
        "average_score": avg_score,
        "recent_analyses": sorted(analyses, key=lambda x: x.get("created_at", ""), reverse=True)[:10],
    }


@api.get("/search")
async def search_papers(q: str = "", year: Optional[int] = None):
    query: Dict[str, Any] = {}
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"abstract": {"$regex": q, "$options": "i"}},
        ]
    if year:
        query["year"] = year
    docs = await papers_col.find(query, {"_id": 0, "text": 0}).sort("created_at", -1).to_list(200)
    return {"results": docs}


@api.get("/semantic-search")
async def semantic_search(q: str, limit: int = 10):
    """Search external papers via Semantic Scholar."""
    if not q.strip():
        return {"results": []}
    try:
        async with httpx.AsyncClient(timeout=20) as http:
            r = await http.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params={
                    "query": q,
                    "limit": min(limit, 20),
                    "fields": "title,abstract,year,authors,citationCount,venue,url,externalIds",
                },
            )
            data = r.json().get("data") or [] if r.status_code == 200 else []
            results = [
                {
                    "paper_id": item.get("paperId"),
                    "title": item.get("title", ""),
                    "authors": [a.get("name", "") for a in (item.get("authors") or [])][:6],
                    "year": item.get("year"),
                    "citation_count": item.get("citationCount") or 0,
                    "abstract": (item.get("abstract") or "")[:800],
                    "venue": item.get("venue") or "",
                    "url": item.get("url") or "",
                }
                for item in data
            ]
            return {"results": results}
    except Exception as e:
        return {"results": [], "error": str(e)}


@api.get("/analyze/{paper_id}/stream")
async def analyze_stream(paper_id: str):
    """Server-Sent Events stream for the multi-agent workflow.
    - If no job is running for `paper_id`, this endpoint starts one.
    - The workflow runs in a background task that survives client disconnects.
    - Multiple clients may subscribe; new subscribers get event replay.
    """
    paper = await _get_paper(paper_id)
    text = paper.get("text", "")
    title = paper.get("title", "Untitled")

    if not is_running(paper_id) and not get_events(paper_id):
        # Kick off a fresh workflow with DB persistence callbacks.
        start_ts = datetime.now(timezone.utc)
        collected: Dict[str, Any] = {"agent_outputs": {}}

        await papers_col.update_one({"id": paper_id}, {"$set": {"status": "analyzing"}})

        async def _on_agent_done(agent_id: str, output: Any):
            collected["agent_outputs"][agent_id] = output
            # Incremental persistence — save whatever is available so far.
            partial = _build_analysis_doc(paper_id, collected, start_ts, status="analyzing")
            await analyses_col.replace_one({"paper_id": paper_id}, partial, upsert=True)

        async def _on_complete(final_state: Dict[str, Any]):
            doc = _build_analysis_doc(paper_id, collected, start_ts, status="completed", final_state=final_state)
            await analyses_col.replace_one({"paper_id": paper_id}, doc, upsert=True)
            await papers_col.update_one(
                {"id": paper_id},
                {"$set": {
                    "status": "completed",
                    "title": final_state.get("title") or title,
                    "abstract": final_state.get("abstract") or paper.get("abstract", ""),
                }},
            )

        async def _on_failure(err: str, partial_state: Dict[str, Any]):
            doc = _build_analysis_doc(paper_id, collected, start_ts, status="failed", final_state=partial_state, error=err)
            await analyses_col.replace_one({"paper_id": paper_id}, doc, upsert=True)
            await papers_col.update_one({"id": paper_id}, {"$set": {"status": "failed"}})

        await start_workflow(paper_id, text, title, _on_agent_done, _on_complete, _on_failure)

    async def _sse():
        async for event in subscribe(paper_id):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        _sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _build_analysis_doc(
    paper_id: str,
    collected: Dict[str, Any],
    start_ts: datetime,
    status: str,
    final_state: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
) -> Dict[str, Any]:
    outs = collected["agent_outputs"]
    doc = {
        "id": paper_id + "-analysis",
        "paper_id": paper_id,
        "summary": (final_state or {}).get("summary") or outs.get("summary"),
        "keywords": (final_state or {}).get("keywords") or outs.get("keywords"),
        "gaps": (final_state or {}).get("gaps") or outs.get("gaps"),
        "novelty": (final_state or {}).get("novelty") or outs.get("novelty"),
        "methodology": (final_state or {}).get("methodology") or outs.get("methodology"),
        "score": (final_state or {}).get("score") or outs.get("score"),
        "questions": (final_state or {}).get("questions") or outs.get("questions"),
        "related_papers": (final_state or {}).get("related_papers") or [],
        "final_report": (final_state or {}).get("final_report") or "",
        "total_time_ms": int((datetime.now(timezone.utc) - start_ts).total_seconds() * 1000),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": datetime.now(timezone.utc).isoformat() if status == "completed" else None,
        "status": status,
        "error": error,
    }
    return doc


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def _shutdown():
    client.close()
