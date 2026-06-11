from __future__ import annotations

import json

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from ..models.schemas import ChatRequest, ChatResetRequest
from ..services.chat_service import reset_session, stream_chat

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("")
async def chat(req: ChatRequest):
    async def gen():
        async for event in stream_chat(req.question, req.your_company_id, req.competitor_ids, req.session_id):
            yield {"data": json.dumps(event, default=str)}

    return EventSourceResponse(gen())


@router.post("/reset")
async def reset(req: ChatResetRequest):
    reset_session(req.session_id)
    return {"reset": req.session_id}
