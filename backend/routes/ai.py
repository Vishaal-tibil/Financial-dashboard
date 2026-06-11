# ai.py — LLM endpoints (DEV 2 owns this file)
# POST /api/insights  → AI Insights panel bullets + metric cards
# POST /api/chat      → SSE streaming chat with financial context
# POST /api/summary   → executive summary bullets + takeaway
from fastapi import APIRouter

router = APIRouter()


@router.post("/insights")
def insights():
    return {"insights": [], "metrics": []}


@router.post("/chat")
def chat(body: dict = {}):
    return {"reply": ""}


@router.post("/summary")
def summary():
    return {"bullets": [], "takeaway": ""}
