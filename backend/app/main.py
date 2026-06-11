from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import ensure_data_dirs, get_settings
from .routers import chat, companies, feed, insights, metrics, report

app = FastAPI(title="Competitor Intelligence Dashboard API", version="0.1.0")

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup() -> None:
    ensure_data_dirs()


@app.get("/api/health")
async def health() -> dict:
    return {
        "status": "ok",
        "groq_configured": settings.has_groq,
        "tavily_configured": settings.has_tavily,
    }


app.include_router(companies.router)
app.include_router(metrics.router)
app.include_router(insights.router)
app.include_router(feed.router)
app.include_router(chat.router)
app.include_router(report.router)
