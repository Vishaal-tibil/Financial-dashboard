"""
Thin async wrapper around the Groq chat-completions API.
Reads GROQ_API_KEY from the environment (loaded via dotenv in main.py).
All calls degrade gracefully when no key is set.
"""
import asyncio
import json
import os
from typing import Any, AsyncIterator, Optional

from groq import AsyncGroq

def _model() -> str:
    return os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile").strip()


def _client() -> Optional[AsyncGroq]:
    key = os.environ.get("GROQ_API_KEY", "").strip()
    return AsyncGroq(api_key=key) if key else None


def has_groq() -> bool:
    return bool(os.environ.get("GROQ_API_KEY", "").strip())


class RateLimitError(Exception):
    """Groq 429 — carries a human-readable retry message."""
    pass


def _extract_retry_msg(exc: Exception) -> str:
    s = str(exc)
    import re
    m = re.search(r"Please try again in ([\d]+m[\d.]+s|[\d.]+s)", s)
    return f"Rate limit reached. Please try again in {m.group(1)}." if m else "Rate limit reached. Please try again shortly."


async def complete_json(messages: list[dict], max_retries: int = 1) -> Optional[dict]:
    """Strict JSON-mode completion — returns parsed dict or None.
    Raises RateLimitError on 429 (no retry — don't burn remaining tokens)."""
    client = _client()
    if client is None:
        return None
    try:
        resp = await client.chat.completions.create(
            model=_model(),
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        return json.loads(resp.choices[0].message.content or "{}")
    except Exception as exc:
        if "429" in str(exc):
            raise RateLimitError(_extract_retry_msg(exc)) from exc
        raise


async def complete_with_tools(messages: list[dict], tools: list[dict]) -> Any:
    """One non-streamed turn that may return tool calls."""
    client = _client()
    if client is None:
        return None
    resp = await client.chat.completions.create(
        model=_model(),
        messages=messages,
        tools=tools,
        tool_choice="auto",
        temperature=0.4,
    )
    return resp.choices[0].message


async def stream_completion(messages: list[dict]) -> AsyncIterator[str]:
    """Stream final answer token-by-token. Raw exceptions propagate to caller."""
    client = _client()
    if client is None:
        yield "(AI Assistant not configured — add GROQ_API_KEY to FD/.env)"
        return
    stream = await client.chat.completions.create(
        model=_model(),
        messages=messages,
        temperature=0.5,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content
