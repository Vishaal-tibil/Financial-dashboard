# Financial Dashboard

A full-stack competitive intelligence dashboard for Indian industrial companies. Upload Excel financial data, visualise multi-year KPIs, compare peers, and query an AI-powered analyst.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Lucide icons |
| Backend | FastAPI (Python), SSE streaming |
| AI — Insights/Reports | Qwen 3.5-9B via HuggingFace router |
| AI — Chat (primary) | Groq `llama-3.3-70b-versatile` (streaming) |
| AI — Chat (fallback) | Llama 3.1-8B via HuggingFace router |
| Web search | Tavily API |
| Data | Excel upload → JSON extraction pipeline |

## Features

- **Overview dashboard** — KPI cards, revenue trend, EBITDA table, radar chart, quadrant matrix
- **Competitive analysis** — operational table with peer benchmarking, waterfall charts, live competitor news feed
- **AI Insights panel** — auto-generated bullet insights and standout KPI highlights
- **AI Assistant** — streaming chat with 5-year historical context; automatically falls back to Llama when Groq's daily limit is reached
- **Insight Studio** — structured report generation (executive summary, growth, profitability, working capital)

## Project Structure

```
FD/
├── backend/
│   ├── main.py               # FastAPI app, CORS, router registration
│   ├── context_builder.py    # 5-year time-series context for AI
│   ├── ai_client.py          # HuggingFace (Qwen/Llama) client
│   ├── routes/
│   │   └── ai.py             # /api/insights, /api/chat, /api/feed/*
│   ├── services/
│   │   ├── groq_client.py    # Groq streaming wrapper
│   │   ├── chat_service.py   # AI Assistant logic + Llama fallback
│   │   ├── feed_service.py   # Competitor news feed (Tavily + Groq)
│   │   └── tavily_client.py  # Tavily web search wrapper
│   └── preprocess/
│       └── extract.py        # Excel → JSON extraction
└── frontend/
    └── src/
        ├── pages/Overview.jsx
        └── components/
            ├── ai-assistant/
            ├── ai-insights/
            ├── charts/
            ├── competitive/
            ├── kpi/
            └── layout/
```

## Setup

### 1. Environment variables

Create `FD/.env`:

```env
GROQ_API_KEY=your_groq_api_key
HF_TOKEN=your_huggingface_token
TAVILY_API_KEY=your_tavily_api_key
```

- **GROQ_API_KEY** — from [console.groq.com](https://console.groq.com) (free tier: 100K tokens/day)
- **HF_TOKEN** — from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) (used for Qwen insights + Llama fallback)
- **TAVILY_API_KEY** — from [app.tavily.com](https://app.tavily.com) (web search for competitor news)

### 2. Backend

```bash
cd FD/backend
pip install fastapi uvicorn groq openai tavily-python sse-starlette python-dotenv openpyxl pandas
python -m uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd FD/frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to `http://localhost:8000`.

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
     Llama-3.1-8B via HuggingFace (~2s, no daily limit)
          │
          └─ full response sent as single token event
```

AI Insights and reports use Qwen 3.5-9B (HuggingFace) as primary — this preserves the Groq daily budget for interactive chat sessions.

## Data Format

Upload `.xlsx` files with one sheet per company. The extractor (`preprocess/extract.py`) reads revenue, EBITDA, margins, ROCE, working capital, and debt metrics across up to 5 years and writes `backend/data/companies.json`.
