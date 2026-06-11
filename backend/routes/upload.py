import asyncio
import json
import sys
import time
from pathlib import Path

from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse

router      = APIRouter()
UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
DATA_DIR    = Path(__file__).parent.parent / "data"
SCRIPT      = Path(__file__).parent.parent / "preprocess" / "extract.py"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        async def bad():
            yield _sse("error", {"message": "Only .xlsx / .xls files are allowed"})
        return StreamingResponse(bad(), media_type="text/event-stream")

    dest = UPLOADS_DIR / f"{int(time.time()*1000)}_{file.filename}"
    contents = await file.read()
    dest.write_bytes(contents)

    async def stream():
        yield _sse("progress", {"stage": "uploading", "message": "File received — starting parse…", "pct": 10})

        proc = await asyncio.create_subprocess_exec(
            sys.executable, str(SCRIPT), str(dest), str(DATA_DIR), file.filename,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        async for raw in proc.stdout:
            line = raw.decode().strip()
            if not line:
                continue
            try:
                yield _sse("progress", json.loads(line))
            except json.JSONDecodeError:
                pass

        await proc.wait()

        if proc.returncode == 0:
            yield _sse("ready", {"message": "Data ready", "pct": 100})
        else:
            err_bytes = await proc.stderr.read()
            last = (err_bytes.decode().strip().split("\n") or ["Processing failed"])[-1]
            yield _sse("error", {"message": last})

    return StreamingResponse(stream(), media_type="text/event-stream")
