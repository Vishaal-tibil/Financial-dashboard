# Competitor Intelligence Dashboard — POC Planning File

---

## 1. Project overview

A single-user POC dashboard for competitive financial + news analysis.

- User uploads one Screener.in `.xlsx` per public company (filename = company key).
- User picks **"Your Company"** + one or more **Competitors** from the uploaded list.
- Dashboard renders benchmarking views (KPIs, radar, trends, capital-efficiency, margin
  waterfall), LLM-generated AI insights, a live competitor news feed (Tavily + Groq), and an
  in-dashboard AI chat assistant that reasons over the Excel data and can web-search.
- A financial-year selector and a "Download Report" (PDF) action sit in the header.

Layout follows the provided design image (FinCompare "Executive Cockpit"). Left rail = component
tabs. Home/Overview shows all analytical components stacked; selecting a tab expands that one.

---

## 2. Tech stack

| Layer        | Choice                                                                 |
|--------------|------------------------------------------------------------------------|
| Frontend     | React 18 + Vite + TypeScript                                           |
| Styling      | TailwindCSS (matches the clean card UI in the image)                   |
| Charts       | Recharts (radar, line, scatter/bubble, waterfall via stacked bars)     |
| State/data   | TanStack Query (server state) + Zustand (UI selections)               |
| Backend      | Python 3.11+, FastAPI, Uvicorn                                         |
| Excel parse  | openpyxl (read-only) + pandas                                         |
| LLM          | Groq `llama-3.3-70b-versatile` via `groq` SDK                          |
| Web search   | Tavily (`tavily-python`)                                               |
| Streaming    | SSE (`sse-starlette`) for chat + feed progress                        |
| PDF export   | WeasyPrint (HTML→PDF) **or** Playwright (render a print route)        |
| Storage      | In-memory + on-disk file store (single user, no DB needed for POC)    |

> No database required for the POC. Parsed companies and feed cache live in a JSON-on-disk
> store under `backend/data/`. If you want durability/concurrency later, swap to SQLite.

---

## 3. Data model — Screener Excel structure

Source of truth = **`Data Sheet`** tab. Verified layout (row indices are 0-based and may shift by
a few rows across companies/Screener versions, so **locate sections by their header labels, not
hardcoded row numbers**).

### 3.1 Section anchors (search column A for these labels)
| Section            | Header label cell (col A) | Data starts at the row labeled |
|--------------------|---------------------------|--------------------------------|
| Meta               | `META`                    | rows below: `Number of shares`, `Face Value`, `Current Price`, `Market Capitalization` |
| Annual P&L         | `PROFIT & LOSS`           | `Report Date` row → columns B..K are periods |
| Quarterly          | `Quarters`                | `Report Date` row → columns B..K are quarters |
| Balance Sheet      | `BALANCE SHEET`           | `Report Date` row → columns B..K are periods |
| Cash Flow          | `CASH FLOW:`              | `Report Date` row → columns B..K are periods |
| Annual price       | `PRICE:`                  | columns B..K aligned to annual periods |
| Derived            | `DERIVED:`                | `Adjusted Equity Shares` etc.  |

Parsing algorithm: iterate column A top-to-bottom; when a section header is found, the next row
beginning with `Report Date` defines the period columns; subsequent rows until the next blank/section
are `(line_item_label → [values across period columns])`.

### 3.2 Meta fields (single values)
```
COMPANY NAME            (string)   # display name; still key the company by FILENAME per spec
Number of shares        (float)
Face Value              (float)
Current Price           (float)
Market Capitalization   (float, ₹ Cr)
```

### 3.3 Annual P&L line items (per period, ₹ Cr)
```
Sales
Raw Material Cost
Change in Inventory        # add to Raw Material for true COGS; can be negative
Power and Fuel
Other Mfr. Exp
Employee Cost
Selling and admin
Other Expenses
Other Income
Depreciation
Interest
Profit before tax
Tax
Net profit
Dividend Amount
```
Derived (compute, not stored): `Total Expenses = Sales − OperatingProfit`, where
`Operating Profit = Sales − (RawMaterial + ChangeInInv + Power&Fuel + OtherMfr + Employee + Selling&admin + OtherExpenses)`.
Note: "Selling and admin"/"Other Mfr. Exp" may be missing in the latest column for some companies —
handle missing cells as 0 with a provenance flag.

### 3.4 Quarterly line items (last ~10 quarters, ₹ Cr) — used for **TTM**
```
Sales, Expenses, Other Income, Depreciation, Interest,
Profit before tax, Tax, Net profit, Operating Profit
```
TTM = sum of the **last 4 quarters** for flow metrics.

### 3.5 Balance Sheet line items (per period, ₹ Cr)
```
Equity Share Capital, Reserves, Borrowings, Other Liabilities, Total (liabilities)
Net Block, Capital Work in Progress, Investments, Other Assets, Total (assets)
Receivables, Inventory, Cash & Bank
No. of Equity Shares, Face value
```

### 3.6 Cash Flow line items (per period, ₹ Cr)
```
Cash from Operating Activity, Cash from Investing Activity,
Cash from Financing Activity, Net Cash Flow
```

### 3.7 Periods
The provided file has **FY2017–FY2026** (10 annual periods) and 10 quarters. Do not hardcode the
year range — derive the FY list from the parsed `Report Date` rows. The FY selector options come
from this list.

---

## 4. Metric / KPI catalog (formulas)

All metrics computed in `backend/app/metrics/`. Use latest period unless "TTM" specified. Guard
all divisions against zero/None. Tag each metric with `period` and `is_approx`.

### 4.1 Growth & profitability
| Metric | Formula |
|--------|---------|
| Revenue Growth (YoY) | `Sales[t]/Sales[t-1] − 1` |
| Revenue CAGR (3/5/10y) | `(Sales[t]/Sales[t-n])^(1/n) − 1` |
| Operating Profit (EBITDA proxy) | `Sales − Σ(operating expense lines)` |
| OPM % / EBITDA Margin % | `OperatingProfit / Sales` |
| EBITDA Margin (TTM) | `TTM_OperatingProfit / TTM_Sales` |
| EBIT | `OperatingProfit + OtherIncome − Depreciation` (= PBT + Interest) |
| EBIT Margin % | `EBIT / Sales` |
| PBT Margin % | `PBT / Sales` |
| Net Profit Margin % | `NetProfit / Sales` |
| Effective Tax Rate | `Tax / PBT` |
| EPS | `NetProfit / No. of Equity Shares` (₹ Cr → adjust units) |
| Dividend Payout % | `Dividend Amount / NetProfit` |

### 4.2 Returns & efficiency
| Metric | Formula |
|--------|---------|
| Equity (net worth) | `Equity Share Capital + Reserves` |
| Capital Employed | `Equity + Borrowings` (or `Total Assets − Current Liabilities` if you isolate them) |
| ROE % | `NetProfit / Equity` |
| ROCE % | `EBIT / Capital Employed` |
| ROCE (TTM) % | `TTM_EBIT / Capital Employed(latest)` |
| Asset Turnover (x) | `Sales / Total Assets` |
| Asset Turnover (TTM) | `TTM_Sales / Total Assets(latest)` |
| Inventory Turnover (x) | `Sales / Inventory` (or `COGS / Inventory` — prefer COGS) |
| Fixed Asset Turnover | `Sales / Net Block` |

### 4.3 Working capital & cash
| Metric | Formula |
|--------|---------|
| Debtor (Receivable) Days | `Receivables / Sales × 365` |
| Inventory Days | `Inventory / COGS × 365` (COGS = RawMaterial + ChangeInInv + Power&Fuel; or use Sales) |
| Payable Days (**approx**) | `Other Liabilities / COGS × 365` — label approximate |
| Cash Conversion Cycle (days) | `Debtor Days + Inventory Days − Payable Days` |
| Cash Conversion Ratio | `Cash from Operating / OperatingProfit(EBITDA)` |
| Free Cash Flow (approx) | `Cash from Operating + Cash from Investing` |
| Net Cash Flow | from Cash Flow sheet |

> The image's "Cash Conversion Cycle — 48 Days" is the working-capital CCC above. The user's phrase
> "cash conversion rate" likely means the **ratio** (CFO/EBITDA). Show **both**, clearly labeled.

### 4.4 Leverage & valuation
| Metric | Formula |
|--------|---------|
| Debt-to-Equity | `Borrowings / Equity` |
| Debt Ratio | `Borrowings / Total Assets` |
| Interest Coverage | `EBIT / Interest` |
| P/E | `Current Price / EPS(TTM)` |
| Market Cap | from Meta |
| Price-to-Book | `Market Cap / Equity` |

### 4.5 NOT computable from Screener (render as N/A or manual input)
`Capacity Utilization %`, `EBITDA per Employee`, exact `Payable Days`. See §0.6.

### 4.6 TTM helper
`TTM(metric) = Σ last 4 quarterly values`. Balance-sheet items are stock values → use the latest
period directly (no summation). Margins/returns mixing TTM flows with latest stocks are standard.

---

## 5. Repository structure (monorepo, npm workspaces)

To honor "node_modules and .venv in root": use **npm workspaces** so `node_modules` hoists to the
repo root, and a **root-level `.venv`** for Python.

```
repo-root/
├── PLANNING.md
├── README.md
├── package.json                  # npm workspace root → hoists node_modules to root
├── .gitignore                    # ignores .venv/, node_modules/, .env, backend/data/
├── .venv/                        # python venv (root)
├── node_modules/                 # hoisted (root)
│
├── frontend/                     # React + Vite + TS
│   ├── package.json
│   ├── vite.config.ts            # proxy /api → http://localhost:8000
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/client.ts         # fetch wrappers, SSE helpers
│       ├── store/selections.ts   # zustand: yourCompany, competitors[], fiscalYear
│       ├── components/
│       │   ├── layout/Sidebar.tsx          # Home + 9 component tabs (image style, nav §7.0)
│       │   ├── layout/Header.tsx           # company pickers, FY selector, Download Report
│       │   ├── cockpit/ExecutiveCockpit.tsx
│       │   ├── financial/FinancialBenchmark.tsx   # radar + revenue trend
│       │   ├── operational/OperationalBenchmark.tsx
│       │   ├── capital/CapitalEfficiencyMatrix.tsx # bubble scatter
│       │   ├── margin/MarginWaterfall.tsx
│       │   ├── insights/AIInsights.tsx
│       │   ├── feed/CompetitorIntelFeed.tsx
│       │   ├── chat/AskAIAssistant.tsx
│       │   └── upload/UploadManager.tsx
│       └── pages/Home.tsx        # stacks all analytical components
│
└── backend/                      # FastAPI
    ├── pyproject.toml / requirements.txt
    ├── .env.example              # GROQ_API_KEY=, TAVILY_API_KEY=
    ├── data/                     # on-disk store (git-ignored)
    │   ├── companies/<file>.xlsx # uploaded files
    │   ├── parsed/<company>.json # parsed + metrics cache
    │   └── feed_cache.json
    └── app/
        ├── main.py               # FastAPI app, CORS, routers
        ├── config.py             # env loading (pydantic-settings)
        ├── routers/
        │   ├── companies.py      # upload / list / delete / get parsed
        │   ├── metrics.py        # benchmark payloads per component
        │   ├── insights.py       # AI insights
        │   ├── feed.py           # competitor intel feed (SSE progress)
        │   ├── chat.py           # SSE chat with tool-use
        │   └── report.py         # PDF export
        ├── services/
        │   ├── excel_parser.py   # Data Sheet parser (§3)
        │   ├── metrics/          # formulas (§4)
        │   ├── groq_client.py    # chat completions + tool loop + streaming
        │   ├── tavily_client.py  # search wrapper
        │   ├── feed_service.py   # parallel search → per-article LLM JSON → rank → cache
        │   ├── insight_service.py
        │   ├── chat_service.py   # system prompt builder + tool loop + SSE
        │   └── pdf_service.py
        └── models/schemas.py     # pydantic request/response models
```

---

## 6. Backend API contracts

Base path `/api`. JSON unless noted. CORS allows the Vite dev origin.

### 6.1 Companies
```
POST   /api/companies/upload      multipart file=<xlsx>  → {company_id, company_name, periods[]}
GET    /api/companies             → [{company_id, company_name, periods[], uploaded_at}]
DELETE /api/companies/{company_id}
GET    /api/companies/{company_id}/parsed  → full parsed structure + metrics
```
- `company_id` = slug of filename (per spec). `company_name` = Data Sheet `COMPANY NAME`.
- On upload: parse → compute metrics → write `data/parsed/<id>.json`. Reject non-Screener files
  (missing `Data Sheet` / section anchors) with a 422 and a clear message.

### 6.2 Benchmark metrics (drives components 1–5)
```
POST /api/metrics/benchmark
body: { your_company_id, competitor_ids[], fiscal_year }
→ {
    cockpit: { kpis: [{key,label,value,unit,rank,trend,direction}] },   # component 1
    financial: { radar: [...], revenueTrend: [...] },                    # component 2
    operational: { rows: [{kpi, you, bestInSet, industryMedian, vsBest}] }, # component 3
    capitalEfficiency: [{company, capitalEmployed, ebitMargin, revenue}], # component 4 (bubble)
    marginWaterfall: [{company, revenue, rawMaterialPct, employeePct, otherPct, ebitdaPct}] # component 5
  }
```
Ranks/medians/best-in-set computed across the selected set (your company + competitors).

### 6.3 AI Insights (component 6)
```
POST /api/insights
body: { your_company_id, competitor_ids[], fiscal_year }
→ { insights: [{icon, title, body, severity}] }
```
Backend serializes the computed metrics for the set into a compact text block, prompts Groq to
return **strict JSON** (`response_format={"type":"json_object"}`) with the top insights
(gaps vs best, working-capital opportunities, margin drivers). Cache by (set, FY).

### 6.4 Competitor Intelligence Feed (component 7)
```
POST /api/feed/refresh   body: { competitor_ids[] }   → SSE stream of progress + cards
GET  /api/feed?competitor_ids=...                       → cached cards (ranked)
```
Pipeline per competitor (run competitors **in parallel**, articles **in parallel** within limits):
1. Tavily search: `query = "<company name> news"`, `topic="news"`, `search_depth="advanced"`,
   `include_raw_content=True`, `days=30`, `max_results=8`.
2. For each result, call Groq **once** → strict JSON:
   `{ sentiment: "Positive|Neutral|Negative", category, impact_score: 0-10, summary, key_entities: [] }`.
3. Rank by `recency_weight × impact_score`; cache to `feed_cache.json` with TTL (e.g. 6h).
4. Feed renders cards with sentiment/category badges. Show top N (e.g. 4); "expand" reveals the rest.
Concurrency: `asyncio.gather` with a semaphore (cap ~5 concurrent LLM calls) to respect rate limits.

### 6.5 Ask AI Assistant (component 8) — SSE + tool use
```
POST /api/chat   body: { question, your_company_id, competitor_ids[], session_id }
→ text/event-stream  (token deltas, tool-call events, done)
POST /api/chat/reset  body: { session_id }   → clears session memory
```
Flow:
1. Build system prompt = role + a **serialized data block** of the selected companies' parsed JSON
   (trimmed to key statements + computed metrics to stay within context).
2. Append session memory (in-memory dict keyed by `session_id`; single session for POC).
3. Call Groq with one tool registered:
   ```json
   {"type":"function","function":{"name":"web_search",
     "parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}}}
   ```
4. If the model emits a `tool_call`, run Tavily, append the tool result message, call Groq again.
   Loop until a normal completion, then **stream** the final answer over SSE.
5. Persist the turn to session memory. `reset` clears it; frontend "refresh" button hits reset.

> Groq streaming + tool-calling: stream the **final** answer. Tool-decision turns can be
> non-streamed (collect the tool_calls), then stream the post-tool completion. Emit SSE events:
> `{"type":"tool","name":"web_search","query":...}` so the UI can show "Searching the web…".

### 6.6 Report export (header button)
```
POST /api/report
body: { your_company_id, competitor_ids[], fiscal_year }
→ application/pdf
```
Render an HTML report (cockpit KPIs, charts as static SVG/PNG, insights) → PDF via WeasyPrint,
or render a hidden `/print` frontend route via Playwright and print-to-PDF.

---

## 7. Frontend specification (must match the design image)

> The design image is the **layout source of truth**. Build to its exact alignment: the app shell,
> the header, the selection bar, the 6-tile KPI strip, and the 12-column card grid (3-up row →
> 2-up row → full-width row). Reproduce the inline AI-insight banners, the "vs Best-in-Class" gap
> panel, the chart legends, and the badge styling shown. Do not improvise a different arrangement.

### 7.0 Sidebar tabs — reconciliation (read before building nav)
The image's sidebar lists *FinCompare's own* sections (Market Benchmarking, Scenario & What If,
Reports, Data Dictionary). Those are **not** this project's components. **Use the image's sidebar
visual style** (dark navy rail, icon + label rows, active row highlighted white, logo top, collapse
bottom) but populate it with **this project's 9 components**. So:

Sidebar nav order (this project):
`Home (Overview)` · `Executive Cockpit` · `Financial Benchmarking` · `Operational Benchmarking` ·
`Capital Efficiency Matrix` · `Margin Waterfall` · `AI Insights` · `Competitor Intelligence` ·
`Ask AI Assistant` · `Upload Excel`.

- **Home/Overview** = the exact image layout (all analytical cards in the grid below).
- Clicking any analytical tab routes to that single component, **expanded full-width**.
- `Ask AI Assistant` and `Upload Excel` are full tabs (not on the image; added per spec).

### 7.1 App shell (3 zones)
```
┌──────────┬──────────────────────────────────────────────────────────┐
│ SIDEBAR  │ HEADER (title+subtitle | FY selector · Download · bell · avatar) │
│ (navy,   ├──────────────────────────────────────────────────────────┤
│  fixed   │ SELECTION BAR (Your Company ▾ · Comparing with(n) · chips · +Add)│
│  ~240px, ├──────────────────────────────────────────────────────────┤
│ collap-  │ CONTENT (scrolls): KPI strip → card grid                  │
│ sible to │                                                          │
│ ~72px)   │                                                          │
└──────────┴──────────────────────────────────────────────────────────┘
```
Sidebar fixed left (~240px, collapses to icon-only ~72px via the bottom "Collapse" control).
Header + selection bar are sticky; content scrolls under them.

### 7.2 Design tokens (read from the image)
- **Sidebar bg** deep navy `#0F1B3D`-ish; active row = white pill, navy text; inactive = light-gray text + line icons.
- **Canvas bg** very light gray `#F5F7FB`; **cards** white, `rounded-2xl`, soft shadow, ~`p-5`.
- **Accents**: primary blue `#2D5BFF` (section titles/links), purple `#7C5CFC` (AI), success green `#16A34A` (positive deltas / up arrows), danger red `#DC2626` (negative deltas / down arrows).
- **Section titles**: UPPERCASE, small, colored, with a left icon; optional "(TTM)" suffix in gray.
- **Typography**: sans (Inter). KPI values are large/bold; labels small/uppercase/gray.
- **Badges**: pill, soft-tinted bg (green=Positive, gray=Neutral, red=Negative).
- **Deltas**: colored text with ▲/▼ (green up = good, red down = bad), e.g. `+11 Days` red, `-6 Days` green where lower-is-better.

### 7.3 Header bar
- Left: page title (e.g. "Executive Cockpit") + gray subtitle ("360° performance benchmark vs selected competitors").
- Right (in order): **FY selector** dropdown styled `Last 5 Years (FY20–FY25)` with calendar icon (options derived from parsed data, §3.7); **Download Report** button (download icon); **notification bell** with count badge; **user avatar** block ("SK / S. Kumar / Strategy Head" — static for the single-user POC).

### 7.4 Selection bar
- **Your Company** picker (building icon + "Your Company" caption + selected name + ▾). Single-select from uploaded companies.
- **Comparing with (n)** label.
- **Competitor chips**: each shows company name + `×` to remove. Multi-select.
- **+ Add Competitor** button (opens a picker of remaining uploaded companies).
- Selections live in Zustand and drive every component's API calls.

### 7.5 KPI strip — Executive Cockpit (full-width row, **6 tiles**)
One row, 6 equal tiles (`grid-cols-6`), matching the image exactly:
`Revenue Growth (YoY)` · `EBITDA Margin (TTM)` · `ROCE (TTM)` · `Asset Turnover (TTM)` ·
`Inventory Turns (TTM)` · `Cash Conversion Cycle`. A `View all KPIs →` link sits at the strip's right edge.

Tile anatomy (per image): colored rounded-square **icon** (left), small uppercase **label** (top),
large bold **value** (e.g. `14.2%`, `1.8x`, `48 Days`), and a footer line `Rank #k of N` + ▲/▼ trend arrow.
"View all KPIs" opens the full metric set from §4 (P/E, ROE, Net Margin, D/E, Interest Coverage, CAGR, etc.).

### 7.6 Home grid — exact 12-column map
Below the KPI strip, reproduce these three rows precisely:

**Row A (3 cards): `5 / 4 / 3` columns**
- **FINANCIAL BENCHMARKING** (`col-span-5`) — two inner panels **side by side**:
  - *Financial Health Radar (TTM)*: radar with 7 axes — ROCE, EBITDA Margin, Revenue Growth,
    Asset Turnover, Cash Flow to Sales, Net Profit Margin, Debt Ratio. Three series:
    **Your Company**, **Best in Set**, **Industry Median** (legend below).
  - *Financial Trend – Revenue (₹ Cr)*: multi-line chart across FY periods with an
    **Absolute / Indexed** toggle (top-right). One line per selected company (legend below).
  - Footer link: `View all financial benchmarks →`.
- **OPERATIONAL BENCHMARKING** (`col-span-4`) — table with columns
  `KPI | Your Company | Best in Set | Industry Median | vs Best`. Rows:
  Asset Turnover (x), Inventory Days, Receivable Days, Payable Days *(approx)*,
  Capacity Utilization (%) *(N/A — see §0.6)*, EBITDA per Employee *(N/A)*. `vs Best` is a
  colored delta (▲/▼). Footer link: `View all operational KPIs →`.
- **AI INSIGHTS** (`col-span-3`, purple accent) — "Key Insights" list: each item = small round icon +
  one-line insight (gap vs leader, working-capital opportunity in ₹ Cr, ROCE driver, etc.).
  Footer link: `View all insights →`.

**Row B (2 cards): `6 / 6` columns**
- **CAPITAL EFFICIENCY MATRIX (TTM)** (`col-span-6`):
  - Subtitle "Profitability vs Capital Employed Efficiency"; legend "○ Bubble Size = Revenue (₹ Cr)".
  - Bubble scatter: **X = Capital Employed (₹ Cr)**, **Y = EBIT Margin (%)**, **bubble size = Revenue**,
    one bubble per company (labeled). Four quadrant captions positioned as in the image:
    top-left *High Margin / Low Capital / Best-in-Class*, top-right *High Margin / High Capital / Scale Leaders*,
    bottom-left *Low Margin / Low Capital / Niche Players*, bottom-right *Low Margin / High Capital / Value Destroyers*.
  - **Inline AI-Insight banner** (tinted strip at the bottom of the card) — short LLM sentence about
    who has the best capital efficiency. *(This banner was missing from the first draft.)*
- **MARGIN WATERFALL BENCHMARK (TTM)** (`col-span-6`):
  - Subtitle "EBITDA margin broken down by cost drivers".
  - Table: `Company | Revenue (₹ Cr) | Raw Material Cost % | Employee Cost % | Other Expenses % | EBITDA Margin %`,
    one row per company. The cost-% cells render as small red horizontal bars; EBITDA % as a green bar.
  - **Right side panel** "ABC vs Best-in-Class (Bharat Forge)": big **Margin Gap** figure (e.g. `-6.2pp`)
    and a **Gap Breakdown** list (Raw Material Cost `-4.1pp`, Employee Cost `-1.1pp`, Other Expenses `-1.0pp`).
    Computed as your-company-minus-best-in-set per cost driver. *(This panel was under-specified before.)*
  - **Inline AI-Insight banner** at the bottom — LLM sentence attributing the gap to its main driver.

**Row C (full width): `12` columns**
- **COMPETITOR INTELLIGENCE FEED (Recent Public Updates)** (`col-span-12`): a horizontal row of
  news cards (image shows 4). Each card: company icon + name, 1–2 line summary, date, and a
  sentiment **badge** (Positive/Neutral/Negative). `View all updates →` expands to show the rest.

### 7.7 Ask AI Assistant (tab + optional dock)
Not in the image (added per spec). Provide it as a full **tab** (chat thread, streaming tokens, a
"Searching the web…" indicator when the `web_search` tool fires, a **refresh/reset** button that
clears the session, and persistent **session memory** within the session). Optionally also expose a
small docked launcher on Home, but the tab is the primary surface.

### 7.8 Upload Excel tab
Drag-and-drop uploader (accepts `.xlsx`), a list of uploaded companies (name + periods + uploaded-at),
per-row **delete**, and inline validation errors for non-Screener files (per §6.1).

### 7.9 Tab-expand behavior
Each analytical tab renders the *same* card as on Home but **full-width and enlarged** (bigger charts,
full tables, all rows/insights — i.e. the "View all …" expanded state). Home is the compact overview.

### 7.10 Component → API field mapping
| Component | Source field |
|-----------|--------------|
| KPI strip | `benchmark.cockpit.kpis[]` |
| Financial radar | `benchmark.financial.radar` |
| Revenue trend | `benchmark.financial.revenueTrend` (+ client Absolute/Indexed transform) |
| Operational table | `benchmark.operational.rows[]` |
| Capital efficiency bubbles | `benchmark.capitalEfficiency[]` |
| Margin waterfall + gap panel | `benchmark.marginWaterfall[]` (gap = you − best per driver, computed client or server) |
| AI Insights list | `/insights → insights[]` |
| Inline insight banners (Capital, Margin) | dedicated short strings from `/insights` (one per card) |
| Competitor feed cards | `/feed → cards[]` |
| Chat | `/chat` SSE |

### 7.11 Responsive & guard states
- **≥1280px**: full grid as above. **~768–1279px**: Row A stacks to 2-up then 1-up; Row B stacks 1-up; KPI strip wraps to 3×2. **<768px**: everything single-column; sidebar collapses to icons/drawer.
- **No company uploaded** → empty state prompting upload. **No "Your Company" selected** → prompt to select. **N/A KPIs** (Capacity Utilization, EBITDA/Employee) → render a muted "N/A — not in Screener data" chip, never a fake number.
- **Loading**: skeleton cards. **Feed/insights/chat errors**: inline error with retry; the rest of the dashboard stays functional.

---

## 8. Data flow summary
```
Upload xlsx ──▶ excel_parser (Data Sheet) ──▶ metrics ──▶ parsed/<id>.json
                                                   │
Header selections (you + competitors + FY) ────────┼──▶ /metrics/benchmark ──▶ components 1–5
                                                   ├──▶ /insights ──▶ component 6
Competitor select ─────────────────────────────────┼──▶ /feed/refresh (Tavily+Groq, SSE) ──▶ component 7
Chat question ─────────────────────────────────────┴──▶ /chat (Groq tool-loop + Tavily, SSE) ──▶ component 8
Download Report ──▶ /report ──▶ PDF
```

---

## 9. Config & env

`backend/.env` (from `.env.example`, git-ignored):
```
GROQ_API_KEY=<rotated_key>
GROQ_MODEL=llama-3.3-70b-versatile
TAVILY_API_KEY=<rotated_key>
FEED_CACHE_TTL_HOURS=6
MAX_CONCURRENT_LLM=5
CORS_ORIGINS=http://localhost:5173
```
`.gitignore` must include: `.venv/`, `node_modules/`, `.env`, `backend/data/`, `dist/`, `__pycache__/`.

---

## 10. Build order (milestones)

1. **Scaffold** monorepo: root `package.json` workspace, `frontend/` (Vite TS + Tailwind), `backend/` (FastAPI), `.gitignore`, `.env.example`, README skeleton.
2. **Excel parser** (`excel_parser.py`) against `Carborundum.xlsx`; unit-test section detection + period extraction. Reject non-Screener files.
3. **Metrics engine** (§4) with unit tests on parsed Carborundum numbers.
4. **Companies API** (upload/list/delete/parsed) + **Upload Manager** UI (component 9). End-to-end: upload → see parsed metrics.
5. **Benchmark API** (§6.2) + **Header selectors** (you/competitors/FY) + **Executive Cockpit** (component 1).
6. **Financial / Operational / Capital / Margin** components (2–5) wired to the benchmark payload.
7. **AI Insights** (component 6) — Groq JSON mode.
8. **Tavily + Feed** (component 7) with SSE progress, ranking, cache, expand.
9. **Chat assistant** (component 8) — Groq tool-loop + Tavily + SSE + session memory + reset.
10. **Report PDF** (header) + **Home/Overview** aggregation + polish to match the image.

Build in this order so each layer is testable before the next depends on it.

---

## 11. README must include
- Prereqs (Node 18+, Python 3.11+).
- Backend: create root `.venv`, `pip install -r backend/requirements.txt`, copy `.env.example`→`.env`, add keys, `uvicorn app.main:app --reload` from `backend/`.
- Frontend: `npm install` at root (workspaces), `npm run dev --workspace frontend`.
- Vite proxy note (`/api`→`:8000`).
- How to upload a Screener export, select companies, refresh the feed, use chat.
- Explicit security note: keys live in `backend/.env`, never committed, never sent to the browser.

---

## 12. Robustness / edge cases
- **Missing cells** (e.g. last column lacks "Selling and admin"): treat as 0, set `is_partial` flag, surface in provenance.
- **Negative "Change in Inventory"**: include with sign in COGS.
- **Row drift across Screener versions**: parse by header labels + the `Report Date` anchor, never fixed indices.
- **Fewer than 4 quarters**: TTM falls back to available quarters and flags `ttm_partial`.
- **Division by zero / None**: metrics return `null` + reason, UI shows "—".
- **Tavily/Groq failures**: feed/insights/chat degrade gracefully with retry + visible error, never crash the dashboard.
- **Rate limits**: semaphore-bounded concurrency; exponential backoff on 429.
- **Company name collisions**: filename-derived `company_id` must be unique; reject duplicate filenames or suffix them.
- **Units**: Screener values are ₹ Cr; shares are absolute counts — convert carefully for EPS/PE.
```
