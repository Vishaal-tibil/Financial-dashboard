import subprocess
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")   # load FD/.env before anything else

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routes import upload, data, ai

# Excel files live in the parent "Financial Dashboard" folder
EXCEL_DIR = Path(__file__).parent.parent.parent
SCRIPT    = Path(__file__).parent / "preprocess" / "extract.py"
DATA_DIR  = Path(__file__).parent / "data"

EXCEL_FILES = [
    "Carborundum.xlsx",
    "Grindwell.xlsx",
    "SKF.xlsx",
    "Timken.xlsx",
    "Wendt.xlsx",
]


def _bootstrap_data():
    """Parse all Excel files once if data hasn't been loaded yet."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if (DATA_DIR / "meta.json").exists():
        return  # already loaded — skip

    print("[startup] No data found — loading Excel files…")
    for fname in EXCEL_FILES:
        fpath = EXCEL_DIR / fname
        if not fpath.exists():
            print(f"[startup] Skipping {fname} — not found at {fpath}")
            continue
        print(f"[startup] Processing {fname}…")
        result = subprocess.run(
            [sys.executable, str(SCRIPT), str(fpath), str(DATA_DIR), fname],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            print(f"[startup] ERROR parsing {fname}: {result.stderr[-400:]}")
        else:
            print(f"[startup] OK: {fname}")
    print("[startup] Bootstrap complete.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _bootstrap_data()
    yield


app = FastAPI(title="FD Financial Dashboard", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(data.router,   prefix="/api")
app.include_router(ai.router,     prefix="/api")

# Serve React build in production
dist = Path(__file__).parent.parent / "frontend" / "dist"
if dist.exists():
    app.mount("/", StaticFiles(directory=str(dist), html=True), name="static")
