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

# Seed Excel files live alongside the FD/ folder
EXCEL_DIR = Path(__file__).parent.parent.parent
SCRIPT    = Path(__file__).parent / "preprocess" / "extract.py"
DATA_DIR  = Path(__file__).parent / "data"

# These 5 are always auto-loaded from EXCEL_DIR; new companies come in via /api/upload
SEED_FILES = [
    "Carborundum.xlsx",
    "Grindwell.xlsx",
    "SKF.xlsx",
    "Timken.xlsx",
    "Wendt.xlsx",
]


def _run_extract(fpath: Path) -> bool:
    result = subprocess.run(
        [sys.executable, str(SCRIPT), str(fpath), str(DATA_DIR), fpath.name],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"[startup] ERROR processing {fpath.name}:\n{result.stderr[-600:]}")
        return False
    return True


def _bootstrap_data():
    """
    Auto-process all seed Excel files on startup.
    Rebuilds from scratch whenever any seed file is newer than meta.json,
    ensuring the dashboard always reflects the latest Excel data without
    requiring a manual upload.
    Uploaded companies (added via /api/upload) are re-appended after a rebuild.
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    seed_paths = [EXCEL_DIR / f for f in SEED_FILES if (EXCEL_DIR / f).exists()]
    meta       = DATA_DIR / "meta.json"

    if not seed_paths:
        print("[startup] No seed Excel files found — skipping bootstrap")
        return

    # Decide whether a rebuild is needed
    if meta.exists():
        meta_mtime = meta.stat().st_mtime
        needs_rebuild = any(p.stat().st_mtime > meta_mtime for p in seed_paths)
        if not needs_rebuild:
            print(f"[startup] Data is current ({len(seed_paths)} companies) — skipping rebuild")
            return
        print("[startup] Seed files changed — rebuilding data…")
    else:
        print("[startup] No data found — building from Excel files…")

    # Clear stale JSON so extract.py starts fresh (avoids mixing old + new schemas)
    for p in DATA_DIR.glob("*.json"):
        p.unlink()

    # Process seed files
    for fpath in seed_paths:
        print(f"[startup]   {fpath.name}…", end=" ", flush=True)
        ok = _run_extract(fpath)
        print("OK" if ok else "FAILED")

    # Re-process any previously uploaded companies so they survive the rebuild
    uploads_dir = Path(__file__).parent / "uploads"
    if uploads_dir.exists():
        uploaded = sorted(uploads_dir.glob("*.xlsx"), key=lambda p: p.stat().st_mtime)
        # Keep only the latest upload per original filename (strip timestamp prefix)
        seen: dict[str, Path] = {}
        for p in uploaded:
            original = p.name.split("_", 1)[-1] if "_" in p.name else p.name
            seen[original] = p  # later file wins
        for original, fpath in seen.items():
            if original not in SEED_FILES:  # skip if it's already a seed company
                print(f"[startup]   (upload) {original}…", end=" ", flush=True)
                ok = _run_extract(fpath)
                print("OK" if ok else "FAILED")

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
