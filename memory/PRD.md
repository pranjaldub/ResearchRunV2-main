# Research Run — PRD

## Problem statement
Build a modern, production-quality AI web application called **Research Run** — an AI-powered multi-agent research assistant that automates literature review. Feels like an intelligent research workspace (Notion + Perplexity + Linear + ChatGPT), not a chatbot. Multi-agent LangGraph orchestration + Groq inference (no mocks).

## User choices (confirmed)
- LLM: Groq (currently `llama-3.1-8b-instant` — smallest model, to survive free-tier TPM limits)
- UI: shadcn/Tailwind styled to match MUI "glassmorphism" aesthetic (design agent conflict resolution)
- Related papers: Semantic Scholar
- Auth: none

## Personas
- PhD student / researcher scanning many papers
- Reviewer needing fast structured breakdowns
- Instructor building reading lists

## Architecture
- Backend: FastAPI + LangGraph + Groq + pypdf + MongoDB (motor)
- Frontend: React 19, React Router 7, TanStack Query, Framer Motion, Recharts, React Flow, react-markdown, Tailwind + shadcn/ui, sonner
- Streaming: SSE (`text/event-stream`). Workflow runs as a detached asyncio task keyed by paper_id in `_JOBS`; SSE endpoint pub-subs, survives client disconnects.

## Implemented (2026-02)
- Landing page with hero, agent grid, feature bento, workflow preview, stack tags, CTA
- App shell with sidebar (Dashboard / New Analysis / My Papers / Knowledge Base / Research Search / Workflow / Settings)
- Dashboard: 4 stat cards, area chart (paper vs novelty), bar chart (sub-scores), recent papers + pinned
- Upload: drag & drop, progress, paper preview, analyze CTA
- Papers list: cards, pin, delete
- Analysis Workspace (3-pane): paper preview | React Flow agent graph | tabbed results (Results / Console / Report / JSON)
- ResultsPanel: scores gauges, TL;DR, contributions, methodology, strengths/weaknesses, gaps, novelty, keywords, concepts, datasets, metrics, equations, future work, related papers
- Live SSE streaming with agent state (pending/running/completed/failed), execution console, JSON viewer
- Knowledge Base: aggregated keywords, concepts, gaps
- Semantic search (Semantic Scholar) + local library search
- Workflow page (LangGraph pipeline)
- Settings page
- 10 agents: parser, summary, keywords, gaps, novelty, methodology, score, related (Semantic Scholar), questions, report
- Rate-limit resilience: smallest Groq model, map-reduce condense for long papers, inter-call cooldown (1.2s), retry-on-429 exp backoff, detached background workflow with incremental DB persistence

## Backlog / next
- **P0** — Session recovery: `_JOBS` is in-memory; on backend restart, active analyses are lost. Add DB-backed resume.
- **P1** — Full-text semantic search over user library using FAISS/Chroma (spec calls for it; currently regex).
- **P1** — Export to PDF (currently markdown copy + JSON download only).
- **P1** — Citation graph on paper details.
- **P2** — Auth (Google / JWT) for multi-user workspace.
- **P2** — Bookmarks page + keyboard shortcuts + light theme toggle.
- **P2** — Paginated/cursor loading of paper list.
