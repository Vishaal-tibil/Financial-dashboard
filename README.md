# FinCompare — Financial Dashboard

A full-stack competitive intelligence dashboard for Indian industrial companies. Excel files are auto-loaded on startup — no manual upload needed. Visualise multi-year KPIs, compare peers across any fiscal year or quarter, and query an AI-powered analyst scoped strictly to your company data.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Chart.js, Lucide icons |
| Backend | FastAPI (Python), SSE streaming |
| AI — Insights/Reports | Qwen (via HuggingFace router) |
| AI — Chat (primary) | Groq `llama-3.3-70b-versatile` (streaming) |
| AI — Chat (fallback) | Mistral (when Groq is rate-limited) |
| AI — News classification | Groq (relevance + sentiment + summary) |
| Web search / news | Tavily API |
| Data | Excel → JSON extraction pipeline (`pandas` / `openpyxl`) |

## Features

- **Auto-loaded data** — seed Excel files are extracted on backend startup; frontend connects and navigates straight to the dashboard with no upload step
- **Dynamic FY + quarter filters** — every chart, KPI card, ranking, waterfall, and quadrant matrix updates for whichever year or quarter is selected
- **Quarterly KPI mode** — KPI cards switch to Revenue, OPM, Operating Profit, Net Profit, QoQ Growth, YoY Growth when a specific FY + quarter is pinned
- **Dynamic rankings** — peer ranking in KPI cards is recomputed from time-series data for any selected FY, not just the pre-computed latest-year rank
- **Revenue Growth trend arrow** — shows acceleration/deceleration vs previous period, not just direction
- **EBITDA waterfall benchmark** — per-year cost breakdown (raw material %, employee cost %, other opex %, EBITDA %) across all peers for any selected FY
- **Capital Efficiency Matrix** — bubble chart of EBIT Margin vs Capital Employed, FY-aware
- **Financial radar** — normalised 7-axis radar vs best peer + industry median
- **Competitor intelligence feed** — live news via Tavily, relevance-filtered and sentiment-classified by Groq
- **AI chat (scoped)** — streaming assistant with 5-year historical context; refuses off-topic questions; falls back to Mistral on Groq rate limit
- **Insight Studio** — structured report generation
- **Data-reactive theming** — topbar health strip colour shifts with primary company's computed health score
- **Firebase + EC2 deployment** — GitHub Actions workflow included; frontend to Firebase Hosting, backend as Docker container on EC2

## Project Structure

```
Financial Dashboard/
├── Carborundum.xlsx          # seed data — auto-loaded on backend startup
├── Grindwell.xlsx
├── SKF.xlsx
├── Timken.xlsx
├── Wendt.xlsx
└── FD/
    ├── requirements.txt       # Python dependencies
    ├── package.json           # root npm (concurrently: backend + frontend)
    ├── Dockerfile             # EC2 backend container
    ├── .firebaserc            # Firebase project config
    ├── firebase.json          # Firebase hosting rules
    ├── .github/workflows/deploy.yml   # CI/CD: Firebase + EC2 via DockerHub
    ├── .env                   # API keys — NOT committed
    ├── backend/
    │   ├── main.py            # FastAPI app, CORS, startup bootstrap
    │   ├── context_builder.py # 5-year time-series context for AI prompts
    │   ├── ai_client.py       # HuggingFace (Qwen) + Mistral client
    │   ├── routes/
    │   │   ├── upload.py      # POST /api/upload
    │   │   ├── data.py        # GET  /api/status /companies /metrics /meta
    │   │   └── ai.py          # POST /api/insights /chat /feed/* /report
    │   ├── services/
    │   │   ├── groq_client.py
    │   │   ├── chat_service.py   # scoped AI chat + Mistral fallback
    │   │   ├── feed_service.py   # competitor news (Tavily + Groq)
    │   │   └── tavily_client.py
    │   ├── preprocess/
    │   │   └── extract.py     # Excel → JSON pipeline
    │   └── data/              # generated JSON — not committed
    └── frontend/
        └── src/
            ├── App.jsx
            ├── context/AppContext.jsx   # polling, data load, page routing
            ├── utils/fy.js              # FY label + quarter parsing
            ├── hooks/
            ├── pages/
            └── components/
                ├── kpi/          # KpiRow, KpiCard (dynamic FY/quarter/ranking)
                ├── charts/       # Radar, Revenue, Operational, Quadrant, EBITDA
                ├── competitive/  # news feed
                ├── ai-assistant/
                ├── ai-insights/
                └── layout/       # TopBar (FY/quarter filter), Sidebar, RightPanel
```

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- API keys: Groq, HuggingFace, Tavily, Mistral (optional fallback)

## Setup

### 1. Environment variables

Create `FD/.env` (gitignored — never commit):

```env
HF_TOKEN=your_huggingface_token
GROQ_API_KEY=your_groq_api_key
MISTRAL_API_KEY=your_mistral_api_key
TAVILY_API_KEY=your_tavily_api_key
```

| Key | Where to get it |
|---|---|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) |
| `HF_TOKEN` | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| `MISTRAL_API_KEY` | [console.mistral.ai](https://console.mistral.ai) |
| `TAVILY_API_KEY` | [app.tavily.com](https://app.tavily.com) |

### 2. Install Python dependencies

```bash
cd FD
pip install -r requirements.txt
```

### 3. Install frontend dependencies

```bash
cd FD/frontend
npm install
```

## Running the app

**IMPORTANT: always start the backend first, then the frontend.**

### Terminal 1 — Backend

```bash
cd "FD/backend"
python -m uvicorn main:app --reload --port 8000
```

Expected output:
```
[startup] Data is current (5 companies) — skipping rebuild
INFO:     Application startup complete.
```

### Terminal 2 — Frontend

```bash
cd "FD/frontend"
npm run dev
```

Open the URL Vite prints (default **http://localhost:5173**).

The app shows a brief "Connecting to backend…" spinner, then navigates straight to the dashboard — no upload required.

### Troubleshooting: dashboard not loading

If you see the upload page instead of the dashboard, another process is already on port 8000. Fix:

```powershell
# Kill all Python processes, then restart backend
taskkill /F /IM python.exe
```

Verify the correct backend is running by opening `http://127.0.0.1:8000/docs` — you should see routes like `/api/status`, `/api/companies`, `/api/metrics`. If you see `/process`, `/health`, it's a different backend.

## How the filter system works

The **FY dropdown** in the topbar controls the entire dashboard:

| Selection | Behaviour |
|---|---|
| Last 3 / 5 / 7 / 10 FY | Time-series charts show that window; KPIs show latest in window |
| Specific FY (e.g. FY25) | Every chart, KPI, waterfall, quadrant uses that exact year's data |
| FY + Quarter (Q1–Q4) | KPI cards switch to quarterly metrics (Revenue, OPM, Op Profit, Net Profit, QoQ/YoY growth) |

Rankings in KPI cards are recomputed dynamically from time-series data for any selected FY.

## Deployment (Firebase + EC2)

### GitHub Actions — automatic on push to `main`

Set these 7 secrets in your repo (Settings → Secrets → Actions):

| Secret | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON from Firebase Console → Project Settings → Service Accounts |
| `EC2_API_URL` | `http://<ec2-ip>:8000` |
| `EC2_HOST` | EC2 public IP |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Contents of your `.pem` file |
| `DOCKERHUB_USERNAME` | DockerHub username |
| `DOCKERHUB_TOKEN` | DockerHub access token |

### Manual deploy — frontend only

```bash
cd FD/frontend
VITE_API_URL=http://<ec2-ip>:8000 npm run build
firebase deploy --only hosting
```

### EC2 setup (one-time)

```bash
# On the EC2 instance
sudo apt install docker.io -y
mkdir -p /opt/fd
# Create /opt/fd/.env with your API keys
```

## AI Architecture

```
User question
     │
     ├─ Off-topic? (coding, general knowledge, etc.)
     │       └─ Instant "out of scope" reply — no API call
     │
     ▼
Groq llama-3.3-70b (streaming, ~1-2s first token)
     │
     ├─ success → stream tokens to browser
     │
     └─ 429 rate limit
              ▼
         Mistral fallback (single response, no daily limit)
```

The AI chat is scoped to the loaded companies only. It will not answer coding questions, general knowledge, or anything outside financial performance, competitive benchmarking, and business news of the companies in the dashboard.

## Data Format

Upload `.xlsx` files exported from Screener.in (one company per file). The extractor reads:
- **P&L**: revenue, raw material cost, employee cost, EBITDA, depreciation, interest, PBT, tax, net profit
- **Balance sheet**: equity, borrowings, receivables, inventory, cash, capital employed
- **Cash flow**: CFO, capex, FCF
- **Quarterly**: Q1–Q4 revenue, operating profit, net profit, OPM

Outputs `companies.json`, `metrics.json`, `meta.json` in `backend/data/`.

**Fiscal year convention:** stored year = FY end (March); displayed label = stored − 1 (e.g. `2026` → `FY25`, April 2025–March 2026). Quarters: Q1 = Apr–Jun, Q2 = Jul–Sep, Q3 = Oct–Dec, Q4 = Jan–Mar.
