from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..models.schemas import BenchmarkRequest
from ..services.benchmark_service import build_benchmark

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.post("/benchmark")
async def benchmark(req: BenchmarkRequest):
    try:
        return build_benchmark(req.your_company_id, req.competitor_ids, req.fiscal_year)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
