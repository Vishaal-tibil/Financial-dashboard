"""On-disk + in-memory store for parsed companies (single-user POC).

Layout (under backend/data/, git-ignored):
  companies/<id>.xlsx   uploaded raw files
  parsed/<id>.json      parsed structure + computed metrics
"""
from __future__ import annotations

import datetime as _dt
import json
import re
from pathlib import Path
from typing import Any, Optional

from ..config import COMPANIES_DIR, PARSED_DIR, ensure_data_dirs
from .excel_parser import NotAScreenerFile, parse_screener_file
from .metrics.engine import CompanyData, compute_company_metrics


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"\.xlsx?$", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "company"


def _parsed_path(company_id: str) -> Path:
    return PARSED_DIR / f"{company_id}.json"


def list_companies() -> list[dict[str, Any]]:
    ensure_data_dirs()
    out: list[dict[str, Any]] = []
    for p in sorted(PARSED_DIR.glob("*.json")):
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        out.append(
            {
                "company_id": data.get("company_id", p.stem),
                "company_name": data.get("company_name", p.stem),
                "periods": data.get("periods", []),
                "uploaded_at": data.get("uploaded_at"),
            }
        )
    return out


def get_parsed(company_id: str) -> Optional[dict[str, Any]]:
    p = _parsed_path(company_id)
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def delete_company(company_id: str) -> bool:
    ensure_data_dirs()
    removed = False
    pj = _parsed_path(company_id)
    if pj.exists():
        pj.unlink()
        removed = True
    for ext in (".xlsx", ".xls"):
        xp = COMPANIES_DIR / f"{company_id}{ext}"
        if xp.exists():
            xp.unlink()
            removed = True
    return removed


def company_exists(company_id: str) -> bool:
    return _parsed_path(company_id).exists()


def process_upload(filename: str, content: bytes) -> dict[str, Any]:
    """Save, parse, compute metrics, persist. Returns the summary dict.

    Raises NotAScreenerFile on invalid input.
    """
    ensure_data_dirs()
    company_id = slugify(filename)
    # unique id if collision with a different existing company
    if company_exists(company_id):
        # overwrite the same file deliberately; spec says reject dup filenames,
        # but for a single-user POC we treat re-upload as replace.
        pass

    xlsx_path = COMPANIES_DIR / f"{company_id}.xlsx"
    xlsx_path.write_bytes(content)

    try:
        wb = parse_screener_file(str(xlsx_path))
    except NotAScreenerFile:
        xlsx_path.unlink(missing_ok=True)
        raise

    parsed = wb.to_dict()
    company_name = parsed.get("company_name") or company_id
    cdata = CompanyData(parsed, company_id)
    metrics_all_fy = {
        fy: compute_company_metrics(cdata, fy)["metrics"] for fy in cdata.annual_periods
    }

    record = {
        "company_id": company_id,
        "company_name": company_name,
        "periods": cdata.annual_periods,
        "uploaded_at": _dt.datetime.utcnow().isoformat() + "Z",
        "parsed": parsed,
        "metrics_by_fy": metrics_all_fy,
    }
    _parsed_path(company_id).write_text(json.dumps(record, indent=2, default=str), encoding="utf-8")
    return {
        "company_id": company_id,
        "company_name": company_name,
        "periods": cdata.annual_periods,
    }


def get_company_data(company_id: str) -> Optional[CompanyData]:
    record = get_parsed(company_id)
    if not record:
        return None
    return CompanyData(record["parsed"], company_id)
