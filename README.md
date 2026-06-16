# Financial Dashboard

A full-stack competitive intelligence dashboard for Indian industrial companies. Upload Excel financial data, visualise multi-year KPIs, compare peers, and query an AI-powered analyst.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Chart.js, Lucide icons |
| Backend | FastAPI (Python), SSE streaming |
| AI — Insights/Reports | Qwen (via HuggingFace router, `openai` SDK pointed at HF) |
| AI — Chat (primary) | Groq `llama-3.3-70b-versatile` (streaming) |
| AI — Chat (fallback) | Mistral (when Groq is rate-limited) |
| AI — News classification | Groq (relevance + sentiment + summary) |
| Web search / news | Tavily API |
| Data | Excel upload → JSON extraction pipeline (`pandas`/`openpyxl`) |

## Features

- **Overview dashboard** — animated KPI cards (with quarter drill-down), revenue trend, EBITDA waterfall with AI insight, radar chart, quadrant matrix with AI insight
- **Data-reactive theming** — accent color and topbar health strip shift with the primary company's computed health score
- **Competitive analysis** — operational table with peer benchmarking, waterfall charts, live competitor news feed (Tavily + Groq relevance filtering)
- **AI Insights panel** — auto-generated bullet insights and standout KPI highlights
- **AI Assistant** — streaming chat with 5-year historical context; falls back to Mistral when Groq's daily limit is reached
- **Insight Studio** — structured report generation (executive summary, growth, profitability, working capital)

## Project Structure

```
Financial Dashboard/
├── Carborundum.xlsx, Grindwell.xlsx, SKF.xlsx, Timken.xlsx, Wendt.xlsx   # seed data, auto-loaded on backend startup
└── FD/
    ├── requirements.txt       # Python deps
    ├── package.json           # root npm scripts (runs backend + frontend together)
    ├── .env                   # API keys (not committed)
    ├── backend/
    │   ├── main.py            # FastAPI app, CORS, startup bootstrap, router registration
    │   ├── context_builder.py # 5-year time-series context for AI prompts
    │   ├── ai_client.py       # HuggingFace (Qwen) + Mistral client
    │   ├── routes/
    │   │   ├── upload.py      # /api/upload
    │   │   ├── data.py        # /api/companies, /api/metrics, /api/meta, /api/status
    │   │   └── ai.py          # /api/insights, /api/chat, /api/feed/*, /api/report
    │   ├── services/
    │   │   ├── groq_client.py    # Groq streaming wrapper
    │   │   ├── chat_service.py   # AI Assistant logic + Mistral fallback
    │   │   ├── feed_service.py   # Competitor news feed (Tavily + Groq)
    │   │   └── tavily_client.py  # Tavily web search wrapper
    │   ├── preprocess/
    │   │   └── extract.py     # Excel → JSON extraction
    │   └── data/               # generated JSON (companies.json, metrics, feed_cache.json) — not committed
    └── frontend/
        └── src/
            ├── App.jsx
            ├── context/AppContext.jsx
            ├── hooks/          # useCountUp, useHealthScore
            ├── pages/Overview.jsx
            └── components/
                ├── ai-assistant/
                ├── ai-insights/
                ├── charts/
                ├── competitive/
                ├── kpi/
                └── layout/
```

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- API keys for Groq, HuggingFace, Tavily, and (optionally) Mistral

## Setup

### 1. Environment variables

Create `FD/.env` (this file is gitignored — never commit it):

```env
HF_TOKEN=your_huggingface_token
GROQ_API_KEY=your_groq_api_key
MISTRAL_API_KEY=your_mistral_api_key
TAVILY_API_KEY=your_tavily_api_key
```

- **GROQ_API_KEY** — [console.groq.com](https://console.groq.com) — primary streaming chat model + news classification
- **HF_TOKEN** — [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) — Qwen insights/report generation
- **MISTRAL_API_KEY** — [console.mistral.ai](https://console.mistral.ai) — fallback when Groq is rate-limited
- **TAVILY_API_KEY** — [app.tavily.com](https://app.tavily.com) — web search for competitor news and chat web-search tool

### 2. Backend — install dependencies

```bash
cd FD
pip install -r requirements.txt
```

### 3. Frontend — install dependencies

```bash
cd FD/frontend
npm install
```

## Running the app

### Option A — one command (recommended)

From `FD/`:

```bash
cd FD
npm install        # only needed once, installs `concurrently`
npm run dev
```

This starts the FastAPI backend (port 8000) and the Vite frontend dev server together. The Vite dev server proxies `/api/*` requests to `http://localhost:8000`.

Open **http://localhost:5173** (Vite's default port — check the terminal output for the exact URL).

### Option B — run backend and frontend separately

**Terminal 1 — backend:**
```bash
cd FD/backend
python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 — frontend:**
```bash
cd FD/frontend
npm run dev
```

### First run behavior

On backend startup, `main.py` auto-bootstraps data from the seed Excel files (`Carborundum.xlsx`, `Grindwell.xlsx`, `SKF.xlsx`, `Timken.xlsx`, `Wendt.xlsx`) located one directory above `FD/`. It extracts them into `FD/backend/data/*.json`. Subsequent restarts skip re-extraction unless a seed file's modified time is newer than the existing data. You can also upload additional `.xlsx` files from the dashboard's Upload page.

### Production build

```bash
cd FD/frontend
npm run build
cd ../backend
python -m uvicorn main:app --port 8000
```

`main.py` automatically serves `frontend/dist` as static files when present, so a single backend process serves the whole app on port 8000.

## AI Architecture

```
User question
     │
     ▼
Groq llama-3.3-70b (streaming, ~1-2s first token)
     │
     ├─ success → stream tokens to browser
     │
     └─ 429 rate limit
          │
          ▼
     Mistral fallback (single response, no daily limit)
```

AI Insights and reports use Qwen (via HuggingFace router) as primary, with a Mistral fallback on Groq rate limits — this preserves the Groq daily budget for interactive chat sessions. Competitor news relevance/sentiment classification uses Groq directly (an `is_relevant` flag in the classification prompt filters out articles that aren't primarily about the queried company).

## Data Format

Upload `.xlsx` files with one sheet per company. The extractor (`backend/preprocess/extract.py`) reads revenue, EBITDA, margins, ROCE, working capital, debt metrics, and quarterly results (`q_labels`, `q_sales`, `q_op`, `q_net`, `q_opm`) across up to 5 years and writes `backend/data/companies.json` + per-company metrics JSON.

**Fiscal year convention:** stored year = fiscal year end (March year-end); displayed FY label = stored year − 1 (e.g. stored `2026` → shown as `FY25`, covering April 2025–March 2026). Quarters follow the Indian FY calendar: Q1 = Apr–Jun, Q2 = Jul–Sep, Q3 = Oct–Dec, Q4 = Jan–Mar.
