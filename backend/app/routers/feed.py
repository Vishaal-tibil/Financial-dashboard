from __future__ import annotations

import json

from fastapi import APIRouter, Query
from sse_starlette.sse import EventSourceResponse

from ..models.schemas import FeedRequest
from ..services.feed_service import get_cached_feed, refresh_feed, stream_refresh

router = APIRouter(prefix="/api/feed", tags=["feed"])


@router.get("")
async def cached(competitor_ids: str = Query("")):
    ids = [c for c in competitor_ids.split(",") if c]
    cards, cached_flag = get_cached_feed(ids)
    return {"cards": cards, "cached": cached_flag}


@router.post("/refresh")
async def refresh(req: FeedRequest):
    """Non-SSE refresh (returns full ranked list)."""
    cards = await refresh_feed(req.competitor_ids)
    return {"cards": cards, "cached": False}


@router.post("/refresh/stream")
async def refresh_stream(req: FeedRequest):
    async def gen():
        async for event in stream_refresh(req.competitor_ids):
            yield {"data": json.dumps(event, default=str)}

    return EventSourceResponse(gen())
