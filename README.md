# Competitor Intelligence Dashboard (POC)

A single-user dashboard for competitive **financial + news** analysis. Upload one
[Screener.in](https://www.screener.in) `.xlsx` per public company, pick **Your Company** and
one or more **Competitors**, and the dashboard renders benchmarking views (KPIs, radar, trends,
capital-efficiency, margin waterfall), LLM-generated AI insights, a live competitor news feed
(Tavily + Groq), an in-dashboard AI chat assistant, and a downloadable PDF/HTML report.

Layout follows the FinCompare "Executive Cockpit" design: a navy left rail of component tabs,
a sticky header (FY selector + Download Report), a company selection bar, and a 12-column card grid.

---

## Tech stack

| Layer       | Choice                                                            |
|-------------|-------------------------------------------------------------------|
| Frontend    | React 18 · Vite · TypeScript · TailwindCSS · Recharts             |
| State/data  | TanStack Query (server state) · Zustand (UI selections)           |
| Backend     | Python 3.11+ · FastAPI · Uvicorn                                  |
| Excel parse | openpyxl (read-only)                                              |
| LLM         | Groq `llama-3.3-70b-versatile` (`groq` SDK)                        |
| Web search  | Tavily (`tavily-python`)                                          |
| Streaming   | SSE (`sse-starlette`) for chat + feed progress                    |
| PDF export  | WeasyPrint (falls back to HTML if native libs are unavailable)    |
| Storage     | In-memory + JSON-on-disk under `backend/data/` (no DB for the POC)|

---

## Prerequisites
- **Node 18+** (developed on Node 24)
- **Python 3.11+**

## Setup

### 1. Backend
```bash
# from the repo root — create the root-level virtualenv
python -m venv .venv

# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r backend/requirements.txt

# configure secrets
cp backend/.env.example backend/.env   # then add your keys
```

Edit `backend/.env`:
```
GROQ_API_KEY=<your key>          # optional — AI insights/chat fall back to heuristics if blank
GROQ_MODEL=llama-3.3-70b-versatile
TAVILY_API_KEY=<your key>        # optional — competitor news feed is disabled if blank
FEED_CACHE_TTL_HOURS=6
MAX_CONCURRENT_LLM=5
CORS_ORIGINS=http://localhost:5173
```

Run the API (from the `backend/` directory):
```bash
cd backend
uvicorn app.main:app --reload
# → http://localhost:8000  (docs at /docs, health at /api/health)
```

### 2. Frontend
```bash
# from the repo root (npm workspaces hoist node_modules to the root)
npm install
npm run dev --workspace frontend
# → http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:8000` (see `frontend/vite.config.ts`),
so run both processes side by side.

---

## Using the dashboard
1. **Upload Excel** tab → drag in one Screener `.xlsx` per company. The filename becomes the
   company key. Non-Screener files (missing a `Data Sheet` / `PROFIT & LOSS` section) are rejected
   with a clear message.
2. In the **selection bar**, pick **Your Company** and **+ Add Competitor**(s).
3. Use the **FY selector** (header) to choose a fiscal year — options are derived from the parsed data.
4. **Home** shows all analytical cards; clicking a sidebar tab expands that component full-width.
5. **Competitor Intelligence** → *Refresh* fetches recent news (needs `TAVILY_API_KEY`).
6. **Ask AI Assistant** → streaming chat that reasons over the data and can web-search; *Reset*
   clears session memory.
7. **Download Report** (header) → PDF (or HTML if WeasyPrint's native deps aren't installed).

---

## Architecture notes
- **Excel parsing** locates sections by their header labels in column A (`META`, `PROFIT & LOSS`,
  `Quarters`, `BALANCE SHEET`, `CASH FLOW:`), never by hardcoded row numbers, so it tolerates row
  drift across Screener versions. Periods come from the `Report Date` anchor row.
- **Metrics** (`backend/app/services/metrics/`) guard every division, flag TTM partials, and treat
  missing optional cost lines as 0. Metrics not derivable from Screener (Capacity Utilization,
  EBITDA/Employee, exact Payable Days) render as **N/A**, never as fabricated numbers.
- **Graceful degradation**: with no API keys, insights use a deterministic heuristic, the feed is
  empty until keys are added, and chat returns a configuration notice — the dashboard never crashes.

### Manual validation
`backend/_smoke_test.py` generates synthetic Screener-shaped workbooks and runs the full
parse → metrics → benchmark pipeline (plus the non-Screener rejection path):
```bash
cd backend && ../.venv/Scripts/python.exe _smoke_test.py   # Windows
# or: python _smoke_test.py   (with the venv active)
```

---

## Security
- API keys live **only** in `backend/.env`, which is git-ignored and never sent to the browser —
  all Groq/Tavily calls happen server-side.
- Uploaded files and the parsed/cache JSON live under `backend/data/` (git-ignored).
