"""Multi-agent research workflow orchestrator powered by Groq + LangGraph.

Each agent receives the shared state, produces structured JSON output validated
by a Pydantic model, and updates the state.  Agent outputs are streamed to the
client via an async queue.
"""
from __future__ import annotations
import asyncio
import json
import logging
import os
import re
import time
from typing import Any, AsyncGenerator, Dict, List, Optional, TypedDict

import httpx
from groq import AsyncGroq
from groq import RateLimitError, APIStatusError, BadRequestError
from langgraph.graph import StateGraph, END

from models import (
    Summary, Keywords, ResearchGap, Novelty, MethodologyReview,
    PaperScore, Questions, RelatedPaper,
)

# Smallest, fastest Groq model — high TPM ceiling to avoid rate limits.
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

# Per-agent input character budget (~1 token ≈ 4 chars).
CHUNK_CHAR_LIMIT = 2400
# Inter-call cooldown to smooth token-per-minute usage.
INTER_CALL_DELAY = 0.6
# Maximum condense chunks (protects TPM budget on long papers).
MAX_CONDENSE_CHUNKS = 2

# ---------------------------------------------------------------------------
# Sliding-window TPM budgeter — Groq free tier caps llama-3.1-8b at ~6000 TPM.
# We proactively pace requests so we never blow the window. Also caps RPM.
# ---------------------------------------------------------------------------
TPM_LIMIT = int(os.environ.get("GROQ_TPM_LIMIT", "5500"))   # safe margin under 6000
RPM_LIMIT = int(os.environ.get("GROQ_RPM_LIMIT", "28"))     # safe margin under 30
WINDOW_SEC = 60


class _TokenBudget:
    """Async-safe sliding-window rate limiter for both tokens/min and requests/min."""
    def __init__(self, tpm: int, rpm: int, window: float):
        self.tpm = tpm
        self.rpm = rpm
        self.window = window
        self.history: List[tuple] = []  # (timestamp, tokens)
        self._lock = asyncio.Lock()

    async def acquire(self, tokens: int) -> None:
        # Never let a single request's estimate exceed the window budget itself,
        # otherwise the wait loop can never satisfy the check.
        tokens = min(tokens, max(1, self.tpm - 100))
        while True:
            async with self._lock:
                now = time.time()
                self.history = [(t, tok) for t, tok in self.history if now - t < self.window]
                used_tokens = sum(tok for _, tok in self.history)
                used_requests = len(self.history)
                if used_tokens + tokens <= self.tpm and used_requests + 1 <= self.rpm:
                    self.history.append((now, tokens))
                    return
                # Compute how long to wait for the earliest entry to age out.
                oldest_ts = self.history[0][0]
                wait = self.window - (now - oldest_ts) + 0.3
            await asyncio.sleep(max(0.5, min(wait, 20)))


_budget = _TokenBudget(TPM_LIMIT, RPM_LIMIT, WINDOW_SEC)


def _estimate_tokens(system: str, user: str, max_out: int) -> int:
    """~1 token ≈ 4 chars for English. Conservative round-up."""
    return int((len(system) + len(user)) / 3.5) + max_out + 40

# Per-agent output token caps. Sized to fit each agent's expected JSON structure
# with headroom so Groq's json_object mode never returns json_validate_failed.
MAX_TOKENS = {
    "condense":   200,
    "summary":    900,
    "keywords":   700,
    "gaps":       800,
    "novelty":    600,
    "methodology":900,
    "score":      450,
    "questions":  900,
    "report":     1200,
}

# Disable internal Groq retries (we handle 429s ourselves with better backoff).
_client = AsyncGroq(api_key=GROQ_API_KEY, max_retries=0)


def _parse_retry_after(err_msg: str, default: float = 8.0) -> float:
    """Extract 'try again in Xs/ms' from Groq's error message."""
    m = re.search(r"try again in ([\d.]+)\s*(ms|s|seconds|milliseconds)", err_msg, re.I)
    if not m:
        return default
    val = float(m.group(1))
    unit = m.group(2).lower()
    return val / 1000.0 if unit.startswith("m") else val


# ---------------------------------------------------------------------------
# JSON extraction helper
# ---------------------------------------------------------------------------
def _extract_json(text: str) -> Dict[str, Any]:
    """Extract the first JSON object from a model response."""
    text = text.strip()
    # remove code fences if present
    fence = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", text, re.DOTALL)
    if fence:
        text = fence.group(1)
    # find first { ... } block
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        blob = text[start : end + 1]
        try:
            return json.loads(blob)
        except Exception:
            # try to fix trailing commas
            blob = re.sub(r",\s*([}\]])", r"\1", blob)
            return json.loads(blob)
    raise ValueError(f"No JSON object found in response: {text[:200]}")


async def _llm_call(
    system: str,
    user: str,
    *,
    max_tokens: int = 900,
    temperature: float = 0.3,
    json_mode: bool = False,
    retries: int = 5,
) -> str:
    """Groq chat completion with retry-on-429 backoff.
    When json_mode is True and Groq returns json_validate_failed (400 because
    the model ran out of tokens before completing the JSON), we automatically
    retry once with double the token budget.
    """
    last_err: Optional[Exception] = None
    current_max = max_tokens
    for attempt in range(retries):
        # Reserve tokens from the sliding-window budget before every attempt.
        estimated = _estimate_tokens(system, user, current_max)
        await _budget.acquire(estimated)

        kwargs: Dict[str, Any] = {
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": current_max,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        try:
            resp = await _client.chat.completions.create(**kwargs)
            await asyncio.sleep(INTER_CALL_DELAY)
            return resp.choices[0].message.content or ""
        except RateLimitError as e:  # 429 — despite budget, race with other jobs
            last_err = e
            wait = _parse_retry_after(str(e), default=6 * (attempt + 1))
            await asyncio.sleep(min(wait + 0.5, 30))
        except BadRequestError as e:  # 400 - often json_validate_failed
            last_err = e
            msg = str(e)
            if json_mode and ("json_validate_failed" in msg or "max completion tokens" in msg or "Failed to generate JSON" in msg):
                current_max = min(current_max * 2, 3500)
                await asyncio.sleep(0.3)
                continue
            raise
        except APIStatusError as e:
            last_err = e
            msg = str(e)
            # json_validate_failed → retry with bigger budget (once, then again if needed)
            if json_mode and ("json_validate_failed" in msg or "max completion tokens reached" in msg):
                current_max = min(current_max * 2, 3500)
                await asyncio.sleep(0.3)
                continue
            if getattr(e, "status_code", 0) == 429:
                await asyncio.sleep(6 * (attempt + 1))
            else:
                raise
    raise last_err if last_err else RuntimeError("LLM call failed")


async def _llm_json(
    system: str,
    user: str,
    schema_hint: str,
    max_tokens: int = 900,
    temperature: float = 0.3,
) -> Dict[str, Any]:
    """Call Groq and return parsed JSON."""
    prompt = (
        f"{user}\n\n"
        f"Respond ONLY with a valid JSON object. No prose, no markdown fences. "
        f"Schema:\n{schema_hint}"
    )
    raw = await _llm_call(system, prompt, max_tokens=max_tokens, temperature=temperature, json_mode=True)
    try:
        return _extract_json(raw or "{}")
    except Exception as e:
        logging.getLogger("research-run.agents").error(
            "Failed to parse JSON from LLM response: %s | raw=%r", e, (raw or "")[:500]
        )
        return {}


def _chunk(text: str, size: int = CHUNK_CHAR_LIMIT) -> List[str]:
    """Split text into character-based chunks, respecting paragraph boundaries when possible."""
    text = text or ""
    if len(text) <= size:
        return [text]
    chunks: List[str] = []
    i = 0
    while i < len(text):
        end = min(i + size, len(text))
        # try to break on paragraph or sentence
        window = text[i:end]
        break_at = max(window.rfind("\n\n"), window.rfind(". "), window.rfind("\n"))
        if break_at > size * 0.6:
            end = i + break_at + 1
        chunks.append(text[i:end])
        i = end
    return chunks


async def _condense(text: str, purpose: str = "research analysis") -> str:
    """Map-reduce condense a long paper into a compact, information-dense digest.
    For smaller papers (< 2 chunks), just return the raw text truncated.
    """
    chunks = _chunk(text, CHUNK_CHAR_LIMIT)
    if len(chunks) <= 1:
        return chunks[0] if chunks else ""
    # Take head + tail chunks to preserve abstract/intro and conclusion/refs region.
    if len(chunks) > MAX_CONDENSE_CHUNKS:
        picked = chunks[: MAX_CONDENSE_CHUNKS - 1] + [chunks[-1]]
    else:
        picked = chunks[:MAX_CONDENSE_CHUNKS]
    partials: List[str] = []
    for c in picked:
        s = await _llm_call(
            system="You condense research paper excerpts into dense, faithful summaries preserving technical detail.",
            user=(
                f"Purpose: {purpose}. Compress the excerpt below to ~80 words, "
                f"retaining methods, results, datasets, metrics, numbers, and terminology.\n\n"
                f"EXCERPT:\n{c}"
            ),
            max_tokens=MAX_TOKENS["condense"],
            temperature=0.2,
        )
        partials.append(s.strip())
    return "\n\n".join(partials)


# ---------------------------------------------------------------------------
# Shared state
# ---------------------------------------------------------------------------
class WorkflowState(TypedDict, total=False):
    paper_id: str
    text: str
    title: str
    abstract: str
    digest: str
    summary: Dict[str, Any]
    keywords: Dict[str, Any]
    gaps: Dict[str, Any]
    novelty: Dict[str, Any]
    methodology: Dict[str, Any]
    score: Dict[str, Any]
    questions: Dict[str, Any]
    related_papers: List[Dict[str, Any]]
    final_report: str
    logs: List[Dict[str, Any]]
    event_queue: Any


AGENTS = [
    {"id": "parser",       "name": "Document Parser",         "description": "Extracted text, structure & metadata"},
    {"id": "summary",      "name": "Summarization Agent",     "description": "TL;DR, contributions & findings"},
    {"id": "keywords",     "name": "Keyword Extractor",       "description": "Keywords, concepts & datasets"},
    {"id": "gaps",         "name": "Research Gap Agent",      "description": "Gaps, open problems & limitations"},
    {"id": "novelty",      "name": "Novelty Analysis Agent",  "description": "Novelty score & similar work"},
    {"id": "methodology",  "name": "Methodology Reviewer",    "description": "Strengths, weaknesses & review"},
    {"id": "score",        "name": "Paper Scoring Agent",     "description": "Overall paper & complexity scores"},
    {"id": "related",      "name": "Related Paper Discovery", "description": "Similar papers via Semantic Scholar"},
    {"id": "questions",    "name": "Question Generator",      "description": "Future work & thesis ideas"},
    {"id": "report",       "name": "Final Report Generator",  "description": "Unified research report"},
]


def _snip(text: str, n: int = 12000) -> str:
    return text[:n]


async def _emit(state: WorkflowState, event: Dict[str, Any]) -> None:
    q = state.get("event_queue")
    if q is not None:
        await q.put(event)


# ---------------------------------------------------------------------------
# Individual agents
# ---------------------------------------------------------------------------
async def parser_node(state: WorkflowState) -> WorkflowState:
    t0 = time.time()
    await _emit(state, {"type": "agent_start", "agent": "parser"})
    text = state.get("text", "")
    # Extract abstract if present
    abstract_match = re.search(
        r"(?is)\babstract\b[\s\-—:]*\n?(.{200,3000}?)(?=\n\n|\n\s*(?:1\.?\s+)?(?:introduction|keywords|index terms))",
        text,
    )
    abstract = abstract_match.group(1).strip() if abstract_match else _snip(text, 1200)
    title_guess = ""
    for line in text.splitlines()[:15]:
        line = line.strip()
        if 10 < len(line) < 180 and not line.lower().startswith(("abstract", "keywords")):
            title_guess = line
            break

    # Condense long papers into a compact digest reused by every downstream agent.
    digest = await _condense(text, purpose="multi-agent research analysis")

    out = {
        "abstract": abstract,
        "title": state.get("title") or title_guess or "Untitled Paper",
        "digest": digest,
    }
    dt = int((time.time() - t0) * 1000)
    await _emit(state, {"type": "agent_done", "agent": "parser",
                        "output": {"pages": state.get("pages"), "abstract": abstract[:400] + ("…" if len(abstract) > 400 else ""),
                                   "digest_chars": len(digest)},
                        "duration_ms": dt})
    return {**state, **out}


async def summary_node(state: WorkflowState) -> WorkflowState:
    t0 = time.time()
    await _emit(state, {"type": "agent_start", "agent": "summary"})
    system = "You are an expert research paper summarizer. Produce concise, high-signal summaries."
    user = (
        f"Paper title: {state.get('title', '')}\n\n"
        f"Paper digest:\n{state.get('digest','')[:CHUNK_CHAR_LIMIT]}\n\n"
        "Produce a structured summary."
    )
    schema = (
        '{"tldr": "string (2-3 sentences)",'
        ' "abstract": "string (5-8 sentences)",'
        ' "key_contributions": ["string", ...],'
        ' "methodology": "string (paragraph)",'
        ' "findings": ["string", ...]}'
    )
    data = await _llm_json(system, user, schema, max_tokens=MAX_TOKENS["summary"])
    summary = Summary(**{k: data.get(k, Summary.model_fields[k].default) for k in Summary.model_fields}).model_dump()
    dt = int((time.time() - t0) * 1000)
    await _emit(state, {"type": "agent_done", "agent": "summary", "output": summary, "duration_ms": dt})
    return {**state, "summary": summary}


async def keywords_node(state: WorkflowState) -> WorkflowState:
    t0 = time.time()
    await _emit(state, {"type": "agent_start", "agent": "keywords"})
    system = "You extract structured technical metadata from research papers."
    user = (
        f"Paper title: {state.get('title', '')}\n"
        f"Summary: {state.get('summary', {}).get('tldr', '')}\n\n"
        f"Digest:\n{state.get('digest','')[:CHUNK_CHAR_LIMIT]}\n\n"
        "Extract keywords, concepts, equations, datasets, metrics."
    )
    schema = (
        '{"keywords": ["string"], "concepts": ["string"], '
        '"equations": ["string in LaTeX or plain"], '
        '"datasets": ["string"], "metrics": ["string"]}'
    )
    data = await _llm_json(system, user, schema, max_tokens=MAX_TOKENS["keywords"])
    kw = Keywords(**{k: data.get(k, []) for k in Keywords.model_fields}).model_dump()
    dt = int((time.time() - t0) * 1000)
    await _emit(state, {"type": "agent_done", "agent": "keywords", "output": kw, "duration_ms": dt})
    return {**state, "keywords": kw}


async def gaps_node(state: WorkflowState) -> WorkflowState:
    t0 = time.time()
    await _emit(state, {"type": "agent_start", "agent": "gaps"})
    system = "You are a critical research reviewer expert at identifying research gaps."
    user = (
        f"Title: {state.get('title', '')}\n"
        f"Summary: {json.dumps(state.get('summary', {}))[:1500]}\n\n"
        f"Digest:\n{state.get('digest','')[:CHUNK_CHAR_LIMIT]}\n\n"
        "Identify concrete research gaps, open problems, and limitations."
    )
    schema = '{"gaps": ["string"], "open_problems": ["string"], "limitations": ["string"]}'
    data = await _llm_json(system, user, schema, max_tokens=MAX_TOKENS["gaps"])
    gaps = ResearchGap(**{k: data.get(k, []) for k in ResearchGap.model_fields}).model_dump()
    dt = int((time.time() - t0) * 1000)
    await _emit(state, {"type": "agent_done", "agent": "gaps", "output": gaps, "duration_ms": dt})
    return {**state, "gaps": gaps}


async def novelty_node(state: WorkflowState) -> WorkflowState:
    t0 = time.time()
    await _emit(state, {"type": "agent_start", "agent": "novelty"})
    system = "You assess the novelty of research contributions relative to prior work."
    user = (
        f"Title: {state.get('title', '')}\n"
        f"Contributions: {json.dumps(state.get('summary', {}).get('key_contributions', []))}\n"
        f"Concepts: {json.dumps(state.get('keywords', {}).get('concepts', []))}\n\n"
        f"Digest excerpt:\n{state.get('digest','')[:3000]}\n\n"
        "Rate novelty from 0 to 10 with reasoning and list similar prior works if identifiable."
    )
    schema = (
        '{"novelty_score": 0.0, "reasoning": "string", '
        '"similar_work": ["short reference or description"]}'
    )
    data = await _llm_json(system, user, schema, max_tokens=MAX_TOKENS["novelty"])
    novelty = Novelty(
        novelty_score=float(data.get("novelty_score", 0) or 0),
        reasoning=str(data.get("reasoning", "")),
        similar_work=list(data.get("similar_work", []) or []),
    ).model_dump()
    dt = int((time.time() - t0) * 1000)
    await _emit(state, {"type": "agent_done", "agent": "novelty", "output": novelty, "duration_ms": dt})
    return {**state, "novelty": novelty}


async def methodology_node(state: WorkflowState) -> WorkflowState:
    t0 = time.time()
    await _emit(state, {"type": "agent_start", "agent": "methodology"})
    system = "You are an expert methodology reviewer providing balanced, critical feedback."
    user = (
        f"Title: {state.get('title', '')}\n"
        f"Methodology: {state.get('summary', {}).get('methodology', '')}\n\n"
        f"Digest:\n{state.get('digest','')[:CHUNK_CHAR_LIMIT]}\n\n"
        "Assess methodology rigor, strengths, weaknesses; write a reviewer comment paragraph."
    )
    schema = '{"strengths": ["string"], "weaknesses": ["string"], "reviewer_comments": "string"}'
    data = await _llm_json(system, user, schema, max_tokens=MAX_TOKENS["methodology"])
    meth = MethodologyReview(
        strengths=list(data.get("strengths", []) or []),
        weaknesses=list(data.get("weaknesses", []) or []),
        reviewer_comments=str(data.get("reviewer_comments", "")),
    ).model_dump()
    dt = int((time.time() - t0) * 1000)
    await _emit(state, {"type": "agent_done", "agent": "methodology", "output": meth, "duration_ms": dt})
    return {**state, "methodology": meth}


async def score_node(state: WorkflowState) -> WorkflowState:
    t0 = time.time()
    await _emit(state, {"type": "agent_start", "agent": "score"})
    system = "You score research papers holistically."
    user = (
        f"Title: {state.get('title', '')}\n"
        f"Summary: {json.dumps(state.get('summary', {}))[:1200]}\n"
        f"Methodology: {json.dumps(state.get('methodology', {}))[:1200]}\n"
        f"Novelty: {json.dumps(state.get('novelty', {}))[:600]}\n\n"
        "Provide numeric scores 0-10 for paper quality, complexity, clarity, impact."
    )
    schema = (
        '{"paper_score": 0.0, "complexity_score": 0.0, "clarity_score": 0.0, '
        '"impact_score": 0.0, "justification": "string"}'
    )
    data = await _llm_json(system, user, schema, max_tokens=MAX_TOKENS["score"])
    sc = PaperScore(
        paper_score=float(data.get("paper_score", 0) or 0),
        complexity_score=float(data.get("complexity_score", 0) or 0),
        clarity_score=float(data.get("clarity_score", 0) or 0),
        impact_score=float(data.get("impact_score", 0) or 0),
        justification=str(data.get("justification", "")),
    ).model_dump()
    dt = int((time.time() - t0) * 1000)
    await _emit(state, {"type": "agent_done", "agent": "score", "output": sc, "duration_ms": dt})
    return {**state, "score": sc}


async def related_node(state: WorkflowState) -> WorkflowState:
    """Use Semantic Scholar to find related papers based on title + keywords."""
    t0 = time.time()
    await _emit(state, {"type": "agent_start", "agent": "related"})
    title = state.get("title", "") or ""
    kws = (state.get("keywords") or {}).get("keywords", [])[:5]
    query = " ".join([title] + kws).strip()[:200] or "research paper"
    related: List[Dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            r = await http.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params={
                    "query": query,
                    "limit": 10,
                    "fields": "title,abstract,year,authors,citationCount,venue,url,externalIds",
                },
            )
            if r.status_code == 200:
                for item in (r.json().get("data") or []):
                    related.append(
                        RelatedPaper(
                            paper_id=item.get("paperId"),
                            title=item.get("title", "") or "",
                            authors=[a.get("name", "") for a in (item.get("authors") or [])][:6],
                            year=item.get("year"),
                            citation_count=item.get("citationCount") or 0,
                            abstract=(item.get("abstract") or "")[:800],
                            venue=item.get("venue") or "",
                            url=item.get("url") or "",
                            similarity_score=None,
                        ).model_dump()
                    )
    except Exception as e:
        await _emit(state, {"type": "agent_log", "agent": "related", "message": f"Semantic Scholar error: {e}"})

    dt = int((time.time() - t0) * 1000)
    await _emit(state, {"type": "agent_done", "agent": "related", "output": {"count": len(related)}, "duration_ms": dt})
    return {**state, "related_papers": related}


async def questions_node(state: WorkflowState) -> WorkflowState:
    t0 = time.time()
    await _emit(state, {"type": "agent_start", "agent": "questions"})
    system = "You generate insightful follow-up research questions and directions."
    user = (
        f"Title: {state.get('title', '')}\n"
        f"Summary: {json.dumps(state.get('summary', {}))[:1200]}\n"
        f"Gaps: {json.dumps(state.get('gaps', {}))[:1200]}\n"
        f"Weaknesses: {json.dumps(state.get('methodology', {}).get('weaknesses', []))[:600]}\n\n"
        "Generate research questions, future work directions, thesis topics and improvements."
    )
    schema = (
        '{"questions": ["string"], "future_work": ["string"], '
        '"thesis_topics": ["string"], "improvements": ["string"]}'
    )
    data = await _llm_json(system, user, schema, max_tokens=MAX_TOKENS["questions"])
    q = Questions(
        questions=list(data.get("questions", []) or []),
        future_work=list(data.get("future_work", []) or []),
        thesis_topics=list(data.get("thesis_topics", []) or []),
        improvements=list(data.get("improvements", []) or []),
    ).model_dump()
    dt = int((time.time() - t0) * 1000)
    await _emit(state, {"type": "agent_done", "agent": "questions", "output": q, "duration_ms": dt})
    return {**state, "questions": q}


async def report_node(state: WorkflowState) -> WorkflowState:
    t0 = time.time()
    await _emit(state, {"type": "agent_start", "agent": "report"})
    system = "You compose a polished markdown research report from structured analyses."
    user = (
        "Combine the following structured analysis into a well-formatted markdown research report "
        "with sections: Overview, Contributions, Methodology, Strengths, Weaknesses, Research Gaps, "
        "Novelty, Related Work, Future Directions, and Verdict.\n\n"
        f"Title: {state.get('title', '')}\n\n"
        f"Summary: {json.dumps(state.get('summary', {}))[:800]}\n"
        f"Keywords: {json.dumps(state.get('keywords', {}))[:500]}\n"
        f"Gaps: {json.dumps(state.get('gaps', {}))[:600]}\n"
        f"Novelty: {json.dumps(state.get('novelty', {}))[:400]}\n"
        f"Methodology: {json.dumps(state.get('methodology', {}))[:700]}\n"
        f"Score: {json.dumps(state.get('score', {}))[:400]}\n"
        f"Questions: {json.dumps(state.get('questions', {}))[:600]}\n"
    )
    report = await _llm_call(
        system=system,
        user=user + "\n\nRespond in markdown.",
        max_tokens=MAX_TOKENS["report"],
        temperature=0.4,
        json_mode=False,
    )
    dt = int((time.time() - t0) * 1000)
    await _emit(state, {"type": "agent_done", "agent": "report", "output": {"length": len(report)}, "duration_ms": dt})
    return {**state, "final_report": report}


# ---------------------------------------------------------------------------
# Build LangGraph workflow
# ---------------------------------------------------------------------------
def build_graph():
    graph = StateGraph(WorkflowState)
    graph.add_node("parser", parser_node)
    graph.add_node("summary", summary_node)
    graph.add_node("keywords", keywords_node)
    graph.add_node("gaps", gaps_node)
    graph.add_node("novelty", novelty_node)
    graph.add_node("methodology", methodology_node)
    graph.add_node("score", score_node)
    graph.add_node("related", related_node)
    graph.add_node("questions", questions_node)
    graph.add_node("report", report_node)

    graph.set_entry_point("parser")
    graph.add_edge("parser", "summary")
    graph.add_edge("summary", "keywords")
    graph.add_edge("keywords", "gaps")
    graph.add_edge("gaps", "novelty")
    graph.add_edge("novelty", "methodology")
    graph.add_edge("methodology", "score")
    graph.add_edge("score", "related")
    graph.add_edge("related", "questions")
    graph.add_edge("questions", "report")
    graph.add_edge("report", END)
    return graph.compile()


_workflow = build_graph()

# Global registry of active workflow jobs. Keyed by paper_id.
# Each entry: {"events": list, "queues": set[asyncio.Queue], "done": bool, "task": asyncio.Task}
_JOBS: Dict[str, Dict[str, Any]] = {}


async def _broadcast(paper_id: str, event: Dict[str, Any]) -> None:
    job = _JOBS.get(paper_id)
    if not job:
        return
    job["events"].append(event)
    for q in list(job["queues"]):
        try:
            q.put_nowait(event)
        except Exception:
            pass


def is_running(paper_id: str) -> bool:
    job = _JOBS.get(paper_id)
    return bool(job and not job["done"])


def get_events(paper_id: str) -> List[Dict[str, Any]]:
    return list((_JOBS.get(paper_id) or {}).get("events", []))


async def start_workflow(
    paper_id: str,
    text: str,
    title: str,
    on_agent_done,     # async fn(agent_id, output)
    on_complete,       # async fn(final_state)
    on_failure,        # async fn(error, partial_state)
) -> None:
    """Start (or reuse) a background workflow task for `paper_id`.
    The task runs independently of any HTTP client — it persists results via callbacks.
    """
    if is_running(paper_id):
        return  # Already running
    _JOBS[paper_id] = {"events": [], "queues": set(), "done": False, "task": None}

    # emit workflow_start with agent list
    await _broadcast(paper_id, {"type": "workflow_start", "agents": AGENTS})

    q_internal: asyncio.Queue = asyncio.Queue()
    state: WorkflowState = {
        "paper_id": paper_id,
        "text": text,
        "title": title,
        "event_queue": q_internal,
    }

    async def _pump():
        """Forward events from internal queue → broadcast."""
        while True:
            ev = await q_internal.get()
            if ev.get("type") == "__pump_done__":
                return
            await _broadcast(paper_id, ev)
            if ev.get("type") == "agent_done":
                try:
                    await on_agent_done(ev.get("agent"), ev.get("output"))
                except Exception:
                    pass

    async def _run():
        pump_task = asyncio.create_task(_pump())
        try:
            result = await _workflow.ainvoke(state)
            final = {
                k: result.get(k) for k in (
                    "title", "abstract", "summary", "keywords", "gaps",
                    "novelty", "methodology", "score", "related_papers",
                    "questions", "final_report"
                )
            }
            try:
                await on_complete(final)
            except Exception:
                pass
            await _broadcast(paper_id, {"type": "workflow_done", "state": final})
        except Exception as e:
            partial = {
                k: state.get(k) for k in (
                    "title", "abstract", "summary", "keywords", "gaps",
                    "novelty", "methodology", "score", "related_papers",
                    "questions", "final_report"
                ) if state.get(k) is not None
            }
            try:
                await on_failure(str(e), partial)
            except Exception:
                pass
            await _broadcast(paper_id, {"type": "workflow_error", "error": str(e), "partial_state": partial})
        finally:
            await q_internal.put({"type": "__pump_done__"})
            await pump_task
            _JOBS[paper_id]["done"] = True
            await _broadcast(paper_id, {"type": "__end__"})
            # Close all subscriber queues
            for q in list(_JOBS[paper_id]["queues"]):
                try:
                    q.put_nowait({"type": "__end__"})
                except Exception:
                    pass

    task = asyncio.create_task(_run())
    _JOBS[paper_id]["task"] = task


async def subscribe(paper_id: str) -> AsyncGenerator[Dict[str, Any], None]:
    """Tail events for a running job. If the job is already complete, replay all events."""
    job = _JOBS.get(paper_id)
    if not job:
        return
    # Replay past events
    for ev in list(job["events"]):
        yield ev
    if job["done"]:
        yield {"type": "__end__"}
        return
    q: asyncio.Queue = asyncio.Queue()
    job["queues"].add(q)
    try:
        while True:
            ev = await q.get()
            if ev.get("type") == "__end__":
                yield ev
                return
            yield ev
    finally:
        job["queues"].discard(q)
