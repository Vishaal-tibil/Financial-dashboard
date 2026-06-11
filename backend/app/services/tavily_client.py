"""Tavily web-search wrapper (async via thread offload)."""
from __future__ import annotations

import asyncio
from typing import Any, Optional

from tavily import TavilyClient

from ..config import get_settings


def _client() -> Optional[TavilyClient]:
    s = get_settings()
    if not s.has_tavily:
        return None
    return TavilyClient(api_key=s.tavily_api_key)


async def search_news(query: str, days: int = 30, max_results: int = 8) -> list[dict[str, Any]]:
    client = _client()
    if client is None:
        return []

    def _run() -> dict[str, Any]:
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

    def _run() -> dict[str, Any]:
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
