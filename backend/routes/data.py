import json
import shutil
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router   = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data"
SAMPLE   = DATA_DIR / "sample"


def read_json(name: str, d: Path = None):
    f = (d or DATA_DIR) / f"{name}.json"
    if not f.exists():
        return None
    try:
        return json.loads(f.read_text(encoding="utf-8"))
    except Exception:
        return None


def write_json(name: str, payload, d: Path = None):
    target = d or DATA_DIR
    target.mkdir(parents=True, exist_ok=True)
    (target / f"{name}.json").write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )


@router.get("/status")
def status():
    meta = read_json("meta")
    return {"ready": meta is not None, "companies": (meta or {}).get("companies", [])}


@router.get("/meta")
def get_meta():
    d = read_json("meta")
    if d is None:
        return JSONResponse({"error": "No data loaded"}, status_code=404)
    return d


@router.get("/companies")
def get_companies():
    d = read_json("companies")
    if d is None:
        return JSONResponse({"error": "No data loaded"}, status_code=404)
    return d


@router.get("/metrics")
def get_metrics():
    d = read_json("metrics")
    if d is None:
        return JSONResponse({"error": "No data loaded"}, status_code=404)
    return d


@router.post("/load-sample")
def load_sample():
    for name in ["meta", "companies", "metrics"]:
        src = read_json(name, SAMPLE)
        if src is not None:
            write_json(name, src)
    return {"ok": True}


@router.post("/reset")
def reset():
    for name in ["meta", "companies", "metrics"]:
        f = DATA_DIR / f"{name}.json"
        if f.exists():
            f.unlink()
    uploads = DATA_DIR.parent / "uploads"
    if uploads.exists():
        shutil.rmtree(uploads)
    uploads.mkdir(exist_ok=True)
    return {"ok": True}
