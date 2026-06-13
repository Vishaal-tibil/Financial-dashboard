# ai.py — LLM endpoints
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
router = APIRouter()

# ── Dev 1: AI Insights (Qwen/HuggingFace) ────────────────────────────────────

INSIGHTS_PROMPT = """
Analyse the financial data and return EXACTLY this JSON (no markdown, no extra keys):

{
  "bullets": [
    "<insight 1 — specific metric, number, company>",
    "<insight 2>",
    "<insight 3>",
    "<insight 4>",
    "<insight 5>"
  ],
  "metrics": [
    {"label": "<KPI name>", "value": "<value with unit>", "company": "<company>", "highlight": "positive|negative|neutral"},
    {"label": "...", "value": "...", "company": "...", "highlight": "..."},
    {"label": "...", "value": "...", "company": "...", "highlight": "..."},
    {"label": "...", "value": "...", "company": "...", "highlight": "..."}
  ]
}

Rules:
- bullets: exactly 5, each starts with a company name or metric name
- metrics: exactly 4 standout KPI snapshots (best ROCE, worst D/E, highest FCF, etc.)
- Use ₹ and % where appropriate
- Highlight the most important cross-company comparisons
"""

SUMMARY_PROMPT = """
Return EXACTLY this JSON (no markdown, no extra keys):

{
  "bullets": [
    "<executive bullet 1>",
    "<executive bullet 2>",
    "<executive bullet 3>"
  ],
  "takeaway": "<one-sentence overall verdict on sector health>"
}

Rules:
- 3 bullets maximum, C-suite tone, specific numbers
- takeaway is a single sentence
"""


@router.post("/insights")
async def insights():
    try:
        from context_builder import build_context
        from services import groq_client
        from ai_client import call_mistral_json_async, has_mistral

        ctx = build_context()
        if ctx == "No financial data loaded.":
            return {"insights": [], "metrics": [], "message": "No data uploaded yet."}

        msgs = [
            {"role": "system", "content": (
                "You are FinBot, an expert financial analyst for Indian industrial companies. "
                "Return ONLY valid JSON as instructed — no markdown fences, no extra keys.\n\n" + ctx
            )},
            {"role": "user", "content": INSIGHTS_PROMPT},
        ]
        try:
            data = await groq_client.complete_json(msgs)
        except groq_client.RateLimitError:
            if not has_mistral():
                raise ValueError("Groq rate limited and MISTRAL_API_KEY not configured.")
            data = await call_mistral_json_async(msgs)

        if not data:
            raise ValueError("Model returned no data")
        return {
            "insights": data.get("bullets", []),
            "metrics":  data.get("metrics",  []),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summary")
async def summary():
    try:
        from context_builder import build_context
        from services import groq_client
        from ai_client import call_mistral_json_async, has_mistral

        ctx = build_context()
        if ctx == "No financial data loaded.":
            return {"bullets": [], "takeaway": "No data uploaded yet."}

        msgs = [
            {"role": "system", "content": (
                "You are FinBot, an expert financial analyst for Indian industrial companies. "
                "Return ONLY valid JSON as instructed — no markdown fences, no extra keys.\n\n" + ctx
            )},
            {"role": "user", "content": SUMMARY_PROMPT},
        ]
        try:
            data = await groq_client.complete_json(msgs)
        except groq_client.RateLimitError:
            if not has_mistral():
                raise ValueError("Groq rate limited and MISTRAL_API_KEY not configured.")
            data = await call_mistral_json_async(msgs)

        if not data:
            raise ValueError("Model returned no data")
        return {
            "bullets":  data.get("bullets",  []),
            "takeaway": data.get("takeaway", ""),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Insight Studio: Report Generation ────────────────────────────────────────

class ReportRequest(BaseModel):
    report_type: str = "executive_summary"
    companies:   list = []
    period:      str  = "Last 5 Years"


@router.post("/report")
async def generate_report(req: ReportRequest):
    try:
        from context_builder import build_context
        from report_builder import build_report_prompt
        from services import groq_client
        from ai_client import call_mistral_json_async, has_mistral

        ctx = build_context()
        if ctx == "No financial data loaded.":
            return {"error": "No data uploaded yet."}

        prompt = build_report_prompt(req.report_type, req.companies, req.period)
        msgs   = [
            {"role": "system", "content": (
                "You are FinBot, an expert financial analyst for Indian industrial companies. "
                "Return ONLY valid JSON as instructed — no markdown fences, no extra keys.\n\n" + ctx
            )},
            {"role": "user", "content": prompt},
        ]
        try:
            data = await groq_client.complete_json(msgs)
        except groq_client.RateLimitError:
            if not has_mistral():
                raise ValueError("Groq rate limited and MISTRAL_API_KEY not configured.")
            data = await call_mistral_json_async(msgs)

        if not data:
            raise ValueError("Model returned unparseable response")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Dev 2: AI Chat Assistant (Groq + Tavily) ──────────────────────────────────

class ChatRequest(BaseModel):
    question:     str
    your_company: str = ""
    competitors:  list[str] = []
    session_id:   str = "default"


class ChatResetRequest(BaseModel):
    session_id: str = "default"


@router.post("/chat")
async def chat(req: ChatRequest):
    from services.chat_service import stream_chat

    async def gen():
        async for event in stream_chat(
            req.question, req.your_company or None, req.competitors, req.session_id
        ):
            yield {"data": json.dumps(event, default=str)}

    return EventSourceResponse(gen())


@router.post("/chat/reset")
async def chat_reset(req: ChatResetRequest):
    from services.chat_service import reset_session
    reset_session(req.session_id)
    return {"reset": req.session_id}


# ── Dev 2: Competitor Intelligence Feed (Tavily + Groq) ──────────────────────

class FeedRequest(BaseModel):
    competitors: list[str] = []


@router.post("/feed/refresh")
async def feed_refresh(req: FeedRequest):
    from services.feed_service import stream_refresh

    async def gen():
        async for event in stream_refresh(req.competitors):
            yield {"data": json.dumps(event, default=str)}

    return EventSourceResponse(gen())


@router.get("/feed/cached")
async def feed_cached(competitors: str = ""):
    from services.feed_service import get_cached_feed
    names = [n.strip() for n in competitors.split(",") if n.strip()]
    cards, _ = get_cached_feed(names)
    return {"cards": cards}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_json(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text  = "\n".join(lines[1:])
    if text.endswith("```"):
        text = text[: text.rfind("```")]
    start = text.find("{")
    end   = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end+1]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {}
