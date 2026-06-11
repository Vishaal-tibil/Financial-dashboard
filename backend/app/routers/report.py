from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response

from ..models.schemas import BenchmarkRequest
from ..services.pdf_service import build_report

router = APIRouter(prefix="/api/report", tags=["report"])


@router.post("")
async def report(req: BenchmarkRequest):
    try:
        content, media_type = await build_report(req.your_company_id, req.competitor_ids, req.fiscal_year)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    ext = "pdf" if media_type == "application/pdf" else "html"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="competitor-report.{ext}"'},
    )
