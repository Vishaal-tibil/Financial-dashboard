"""
Async Tavily wrapper (offloads sync SDK to thread pool).
Reads TAVILY_API_KEY from the environment.
"""
import asyncio
import os
from typing import Any

from tavily import TavilyClient


def _client():
    key = os.environ.get("TAVILY_API_KEY", "").strip()
    return TavilyClient(api_key=key) if key else None


def has_tavily() -> bool:
    return bool(os.environ.get("TAVILY_API_KEY", "").strip())


async def search_news(query: str, days: int = 30, max_results: int = 8) -> list[dict]:
    client = _client()
    if client is None:
        return []

    def _run():
        return client.search(
            query=query,
            topic="news",
            search_depth="advanced",
            include_raw_content=True,
            days=days,
            max_results=max_results,
        )

    try:
        result = await asyncio.to_thread(_run)
        return result.get("results", [])
    except Exception:
        return []


async def search_general(query: str, max_results: int = 5) -> dict[str, Any]:
    client = _client()
    if client is None:
        return {"results": [], "answer": None}

    def _run():
        return client.search(
            query=query,
            search_depth="advanced",
            include_answer=True,
            max_results=max_results,
        )

    try:
        return await asyncio.to_thread(_run)
    except Exception as exc:
        return {"results": [], "answer": None, "error": str(exc)}
