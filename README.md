# Research Run

AI multi-agent research paper reviewer (FastAPI + LangGraph + Groq backend, React frontend).

## What was fixed

- **Scoring (and every other agent) was silently failing** because `GROQ_MODEL` defaulted to
  `llama-3.1-8b-instant`, which Groq deprecated on 2026-06-17. Every LLM call was erroring out,
  and `agents.py` swallowed the JSON-parse failure silently, so `score` (and everything else)
  quietly fell back to `0`/empty. Default model is now `openai/gpt-oss-20b` (override via
  `GROQ_MODEL` in `backend/.env`), and parse failures are now logged instead of hidden.
- `backend/requirements.txt` was missing `groq`, `langgraph`, `pypdf`, and `python-multipart`
  (all needed by the code) and included `emergentintegrations` (a private package from the
  platform this was built on — unused in the code, and it fails to install outside that
  platform). Cleaned up to just what's actually used.
- `server.py` crashed on startup without `MONGO_URL`/`DB_NAME` env vars set — now defaults to
  `mongodb://localhost:27017` / `research_run` for local dev.
- Added `backend/.env`, `frontend/.env` (with local defaults) and `.env.example` files — there
  were none in the repo.
- Added `render.yaml` and `frontend/vercel.json` for deployment.

## Run locally

### Prerequisites

- Python 3.11+
- Node.js 18+ and yarn (or npm)
- MongoDB running locally (`mongod`) — or a free MongoDB Atlas cluster
- A free Groq API key: https://console.groq.com/keys

### 1. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt
```

Edit `backend/.env` and set `GROQ_API_KEY=<your key>` (already scaffolded with local Mongo defaults).

```bash
uvicorn server:app --reload --port 8000
```

Check it's alive: `curl http://localhost:8000/api/`

### 2. Frontend

```bash
cd frontend
yarn install   # or npm install
yarn start     # or npm start
```

`frontend/.env` already points `REACT_APP_BACKEND_URL` at `http://localhost:8000`. App opens at
`http://localhost:3000`.

### 3. Try it

Upload a PDF -> it should parse, then run through the agent pipeline (summary -> keywords -> gaps
-> novelty -> methodology -> **score** -> related papers -> questions -> report). Watch the
backend logs; if any agent's JSON parsing fails you'll now see
`Failed to parse JSON from LLM response: ...` in the console instead of a silent 0.

## Deploy

### Backend -> Render

`render.yaml` is set up as a Blueprint. In the Render dashboard: New -> Blueprint -> point at
this repo. It will read `render.yaml` automatically. Set these env vars in the Render dashboard
(marked `sync: false` so they aren't committed):

- `MONGO_URL` - a MongoDB Atlas connection string (Render's free tier has no persistent disk/DB)
- `GROQ_API_KEY`
- `CORS_ORIGINS` - your Vercel frontend URL once deployed, e.g. `https://your-app.vercel.app`

### Frontend -> Vercel

`frontend/vercel.json` is set up. In Vercel: New Project -> import this repo -> set **root
directory** to `frontend`. Add an environment variable:

- `REACT_APP_BACKEND_URL` - your Render backend URL, e.g. `https://research-run-backend.onrender.com`

(CRA bakes `REACT_APP_*` vars in at build time, so set this _before_ the first deploy, or
redeploy after adding it.)

Once both are live, update the backend's `CORS_ORIGINS` on Render to your real Vercel domain.
