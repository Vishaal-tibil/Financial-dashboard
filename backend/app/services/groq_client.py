"""Thin wrapper around the Groq chat-completions API.

Provides: blocking JSON-mode completion, blocking tool-call turn, and a
streaming generator for the final answer. All calls degrade gracefully when no
API key is configured (callers should check ``settings.has_groq``).
"""
from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncIterator, Optional

from groq import AsyncGroq

from ..config import get_settings


def _client() -> Optional[AsyncGroq]:
    s = get_settings()
    if not s.has_groq:
        return None
    return AsyncGroq(api_key=s.groq_api_key)


async def complete_json(messages: list[dict[str, Any]], max_retries: int = 3) -> Optional[dict[str, Any]]:
    """Call Groq in strict JSON mode; returns the parsed object or None."""
    client = _client()
    if client is None:
        return None
    s = get_settings()
    delay = 1.0
    for attempt in range(max_retries):
        try:
            resp = await client.chat.completions.create(
                model=s.groq_model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            content = resp.choices[0].message.content or "{}"
            return json.loads(content)
        except Exception as exc:  # rate limit / transient
            if attempt == max_retries - 1:
                raise
            if "429" in str(exc) or "rate" in str(exc).lower():
                await asyncio.sleep(delay)
                delay *= 2
            else:
                await asyncio.sleep(0.5)
    return None


async def complete_with_tools(
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]],
) -> Any:
    """One non-streamed turn that may return tool calls."""
    client = _client()
    if client is None:
        return None
    s = get_settings()
    resp = await client.chat.completions.create(
        model=s.groq_model,
        messages=messages,
        tools=tools,
        tool_choice="auto",
        temperature=0.4,
    )
    return resp.choices[0].message


async def stream_completion(messages: list[dict[str, Any]]) -> AsyncIterator[str]:
    """Stream the final answer token-by-token."""
    client = _client()
    if client is None:
        yield "(LLM not configured — set GROQ_API_KEY in backend/.env to enable AI features.)"
        return
    s = get_settings()
    stream = await client.chat.completions.create(
        model=s.groq_model,
        messages=messages,
        temperature=0.5,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content
