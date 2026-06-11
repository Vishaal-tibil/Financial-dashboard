from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..models.schemas import InsightsRequest
from ..services.insight_service import get_insights

router = APIRouter(prefix="/api/insights", tags=["insights"])


@router.post("")
async def insights(req: InsightsRequest):
    try:
        return await get_insights(req.your_company_id, req.competitor_ids, req.fiscal_year)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
