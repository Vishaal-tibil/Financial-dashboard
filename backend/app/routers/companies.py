from __future__ import annotations

from fastapi import APIRouter, HTTPException, UploadFile, File

from ..models.schemas import CompanySummary, UploadResponse
from ..services.excel_parser import NotAScreenerFile
from ..services import store

router = APIRouter(prefix="/api/companies", tags=["companies"])


@router.post("/upload", response_model=UploadResponse)
async def upload_company(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Please upload a Screener .xlsx file.")
    content = await file.read()
    try:
        summary = store.process_upload(file.filename, content)
    except NotAScreenerFile as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Failed to process file: {exc}")
    return summary


@router.get("", response_model=list[CompanySummary])
async def list_all():
    return store.list_companies()


@router.delete("/{company_id}")
async def delete(company_id: str):
    if not store.delete_company(company_id):
        raise HTTPException(status_code=404, detail="Company not found.")
    return {"deleted": company_id}


@router.get("/{company_id}/parsed")
async def get_parsed(company_id: str):
    rec = store.get_parsed(company_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="Company not found.")
    return rec
