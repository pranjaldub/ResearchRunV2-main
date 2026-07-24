"""Backend tests for Research Run - AI multi-agent literature review platform."""
import os
import time
import json
import pytest
import requests
import httpx

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback: read from frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"
PDF_PATH = "/tmp/mtech.pdf"


@pytest.fixture(scope="module")
def uploaded_paper():
    """Upload the mtech.pdf once and share across tests."""
    assert os.path.exists(PDF_PATH), f"PDF not found at {PDF_PATH}"
    with open(PDF_PATH, "rb") as f:
        r = requests.post(f"{API}/upload", files={"file": ("mtech.pdf", f, "application/pdf")}, timeout=60)
    assert r.status_code == 200, f"Upload failed: {r.status_code} {r.text}"
    doc = r.json()
    assert "id" in doc and "title" in doc and "pages" in doc
    assert doc["pages"] > 0
    return doc


# ----------------- Basic endpoints -----------------
def test_root():
    r = requests.get(f"{API}/", timeout=10)
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_upload_and_list(uploaded_paper):
    r = requests.get(f"{API}/papers", timeout=15)
    assert r.status_code == 200
    ids = [p["id"] for p in r.json().get("papers", [])]
    assert uploaded_paper["id"] in ids


def test_get_paper(uploaded_paper):
    r = requests.get(f"{API}/paper/{uploaded_paper['id']}", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "paper" in data
    assert data["paper"]["id"] == uploaded_paper["id"]


def test_reject_non_pdf():
    files = {"file": ("readme.txt", b"hello world this is not pdf", "text/plain")}
    r = requests.post(f"{API}/upload", files=files, timeout=15)
    assert r.status_code == 400


def test_stats():
    r = requests.get(f"{API}/stats", timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ("total_papers", "gaps_found", "keywords_generated", "average_score"):
        assert k in d, f"missing {k}"


def test_semantic_search():
    r = requests.get(f"{API}/semantic-search", params={"q": "transformer"}, timeout=30)
    assert r.status_code == 200, r.text
    assert "results" in r.json()
    assert isinstance(r.json()["results"], list)


def test_local_search(uploaded_paper):
    r = requests.get(f"{API}/search", params={"q": "chunking"}, timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json().get("results"), list)


def test_pin_toggle(uploaded_paper):
    r = requests.post(f"{API}/paper/{uploaded_paper['id']}/pin", json={"pinned": True}, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body.get("ok") is True
    assert body.get("pinned") is True
    # verify persistence
    r2 = requests.get(f"{API}/paper/{uploaded_paper['id']}", timeout=10)
    assert r2.json()["paper"].get("pinned") is True


# ----------------- Analysis + SSE disconnect resilience -----------------
def _read_sse_briefly(paper_id: str, seconds: float = 7.0):
    """Open SSE stream, read for a few seconds, collect event types, then disconnect."""
    events = []
    url = f"{API}/analyze/{paper_id}/stream"
    with httpx.Client(timeout=None) as client:
        with client.stream("GET", url) as resp:
            assert resp.status_code == 200
            start = time.time()
            buf = ""
            for chunk in resp.iter_text():
                buf += chunk
                while "\n\n" in buf:
                    raw, buf = buf.split("\n\n", 1)
                    for line in raw.splitlines():
                        if line.startswith("data:"):
                            try:
                                events.append(json.loads(line[5:].strip()))
                            except Exception:
                                pass
                if time.time() - start > seconds:
                    break
    return events


def test_analysis_survives_sse_disconnect(uploaded_paper):
    pid = uploaded_paper["id"]

    # Start SSE, read briefly, then disconnect
    events = _read_sse_briefly(pid, seconds=7.0)
    types = {e.get("type") for e in events}
    print(f"Initial SSE events collected: {len(events)}, types: {types}")
    assert "workflow_start" in types, f"workflow_start missing; got {types}"

    # Now poll paper status up to 6 minutes for completion (budgeter adds pacing)
    deadline = time.time() + 360
    paper_status = None
    analysis = None
    while time.time() < deadline:
        r = requests.get(f"{API}/paper/{pid}", timeout=15)
        assert r.status_code == 200
        data = r.json()
        paper_status = data["paper"].get("status")
        analysis = data.get("analysis") or {}
        print(f"[{int(time.time()-(deadline-240))}s] status={paper_status} "
              f"has_summary={bool(analysis.get('summary'))} "
              f"has_score={bool(analysis.get('score'))} "
              f"report_len={len(analysis.get('final_report') or '')}")
        if paper_status == "completed":
            break
        if paper_status == "failed":
            pytest.fail(f"Analysis failed: {analysis.get('error')}")
        time.sleep(6)

    assert paper_status == "completed", f"Status never reached completed, last={paper_status}"

    # Validate analysis document
    assert analysis, "no analysis document"
    summary = analysis.get("summary") or {}
    assert summary.get("tldr"), f"summary.tldr empty: {summary}"

    score = analysis.get("score") or {}
    assert isinstance(score.get("paper_score"), (int, float))
    assert float(score["paper_score"]) > 0, f"paper_score not >0: {score}"

    gaps = analysis.get("gaps") or {}
    assert len(gaps.get("gaps") or []) >= 1, f"no gaps: {gaps}"

    kws = analysis.get("keywords") or {}
    assert len(kws.get("keywords") or []) >= 1, f"no keywords: {kws}"

    meth = analysis.get("methodology") or {}
    assert len(meth.get("strengths") or []) >= 1, f"no methodology.strengths: {meth}"

    questions = analysis.get("questions") or {}
    assert len(questions.get("questions") or []) >= 1, f"no questions: {questions}"

    report = analysis.get("final_report") or ""
    assert len(report) > 400, f"final_report too short ({len(report)} chars)"


def test_sse_resume_no_workflow_error(uploaded_paper):
    """Once analysis is done, subscribing again should replay all events. Ensure NO workflow_error appears anywhere."""
    pid = uploaded_paper["id"]
    events = _read_sse_briefly(pid, seconds=6.0)
    types = [e.get("type") for e in events]
    type_set = set(types)
    print(f"Resume SSE types: {type_set}")
    assert "workflow_start" in type_set
    assert ("workflow_done" in type_set) or ("__end__" in type_set), f"no terminal event; types={type_set}"
    # CRITICAL: verify no workflow_error in the replay
    err_events = [e for e in events if e.get("type") == "workflow_error"]
    assert not err_events, f"workflow_error event found in replay: {err_events}"


def test_second_analysis_run_on_same_paper(uploaded_paper):
    """Re-run analysis on the same paper_id. Must still complete successfully with no workflow_error."""
    pid = uploaded_paper["id"]
    # Trigger the SSE endpoint again briefly to (re)start workflow if needed
    events = _read_sse_briefly(pid, seconds=6.0)
    types = {e.get("type") for e in events}
    print(f"2nd run initial SSE types: {types}")

    # Poll for completion again (up to 6 min)
    deadline = time.time() + 360
    paper_status = None
    while time.time() < deadline:
        r = requests.get(f"{API}/paper/{pid}", timeout=15)
        assert r.status_code == 200
        paper_status = r.json()["paper"].get("status")
        if paper_status == "completed":
            break
        if paper_status == "failed":
            pytest.fail(f"2nd run failed: {r.json().get('analysis', {}).get('error')}")
        time.sleep(6)
    assert paper_status == "completed", f"2nd run not completed: {paper_status}"

    # Replay events again and assert no workflow_error
    events2 = _read_sse_briefly(pid, seconds=5.0)
    err_events = [e for e in events2 if e.get("type") == "workflow_error"]
    assert not err_events, f"workflow_error on 2nd run: {err_events}"


# ----------------- Delete (last) -----------------
def test_delete_paper(uploaded_paper):
    pid = uploaded_paper["id"]
    r = requests.delete(f"{API}/paper/{pid}", timeout=15)
    assert r.status_code == 200
    assert r.json().get("ok") is True
    # verify gone
    r2 = requests.get(f"{API}/paper/{pid}", timeout=10)
    assert r2.status_code == 404
