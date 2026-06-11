# ai.py — LLM endpoints
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# ── Dev 1: AI Insights ────────────────────────────────────────────────────────

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
def insights():
    try:
        from ai_client import call_qwen
        from context_builder import build_context

        ctx = build_context()
        if ctx == "No financial data loaded.":
            return {"insights": [], "metrics": [], "message": "No data uploaded yet."}

        raw  = call_qwen(INSIGHTS_PROMPT, ctx, max_tokens=6000)
        data = _parse_json(raw)
        return {
            "insights": data.get("bullets", []),
            "metrics":  data.get("metrics", []),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summary")
def summary():
    try:
        from ai_client import call_qwen
        from context_builder import build_context

        ctx = build_context()
        if ctx == "No financial data loaded.":
            return {"bullets": [], "takeaway": "No data uploaded yet."}

        raw  = call_qwen(SUMMARY_PROMPT, ctx, max_tokens=4000)
        data = _parse_json(raw)
        return {
            "bullets":  data.get("bullets", []),
            "takeaway": data.get("takeaway", ""),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Dev 2: Chat ───────────────────────────────────────────────────────────────

@router.post("/chat")
def chat(body: dict = {}):
    return {"reply": ""}


# ── Insight Studio: Report Generation ────────────────────────────────────────

class ReportRequest(BaseModel):
    report_type: str = "executive_summary"
    companies:   list = []
    period:      str  = "Last 5 Years"


@router.post("/report")
def generate_report(req: ReportRequest):
    try:
        from ai_client import call_qwen
        from context_builder import build_context
        from report_builder import build_report_prompt

        ctx = build_context()
        if ctx == "No financial data loaded.":
            return {"error": "No data uploaded yet."}

        prompt = build_report_prompt(req.report_type, req.companies, req.period)
        raw    = call_qwen(prompt, ctx, max_tokens=4000)
        data   = _parse_json(raw)

        if not data:
            raise ValueError("Model returned unparseable response")

        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_json(raw: str) -> dict:
    text = raw.strip()
    # Strip markdown fences
    if text.startswith("```"):
        lines = text.splitlines()
        text  = "\n".join(lines[1:])
    if text.endswith("```"):
        text = text[: text.rfind("```")]
    # Find the first { and last } to extract JSON object
    start = text.find("{")
    end   = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end+1]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {}
