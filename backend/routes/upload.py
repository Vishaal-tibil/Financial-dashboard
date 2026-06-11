import asyncio
import json
import sys
import subprocess
import threading
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


def _run_extract_thread(dest: Path, data_dir: Path, filename: str,
                         queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
    """Runs extract.py synchronously in a background thread (Windows-safe)."""
    proc = subprocess.Popen(
        [sys.executable, str(SCRIPT), str(dest), str(data_dir), filename],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    for raw in proc.stdout:
        line = raw.strip()
        if line:
            asyncio.run_coroutine_threadsafe(queue.put(("line", line)), loop)
    proc.wait()
    stderr_text = proc.stderr.read()
    asyncio.run_coroutine_threadsafe(queue.put(("done", proc.returncode, stderr_text)), loop)


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

        loop  = asyncio.get_event_loop()
        queue = asyncio.Queue()

        t = threading.Thread(
            target=_run_extract_thread,
            args=(dest, DATA_DIR, file.filename, queue, loop),
            daemon=True,
        )
        t.start()

        while True:
            item = await queue.get()
            if item[0] == "line":
                try:
                    yield _sse("progress", json.loads(item[1]))
                except json.JSONDecodeError:
                    pass
            elif item[0] == "done":
                returncode, stderr_text = item[1], item[2]
                if returncode == 0:
                    yield _sse("ready", {"message": "Data ready", "pct": 100})
                else:
                    last = (stderr_text.strip().split("\n") or ["Processing failed"])[-1]
                    yield _sse("error", {"message": last})
                break

    return StreamingResponse(stream(), media_type="text/event-stream")
