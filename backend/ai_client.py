"""
ai_client.py — HuggingFace + Mistral clients
"""
import asyncio
import os
import re
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).parent.parent / ".env")

HF_BASE_URL      = "https://router.huggingface.co/v1"
TEXT_MODEL       = "Qwen/Qwen3.5-9B:together"
CHAT_MODEL       = "meta-llama/Llama-3.1-8B-Instruct"
MISTRAL_BASE_URL = "https://api.mistral.ai/v1"
MISTRAL_MODEL    = "mistral-small-2506"          # 2.25M TPM, JSON mode, no daily limit

SYSTEM_PROMPT = (
    "You are FinBot, an expert financial analyst specialising in Indian industrial companies. "
    "You have been given structured financial data extracted from uploaded Excel files. "
    "Respond with precise numbers, cite the metric and year when referencing data, "
    "and highlight leaders, laggards, and notable trends. "
    "Return ONLY valid JSON when a JSON format is requested — no markdown fences, no commentary."
)


def _client() -> OpenAI:
    token = os.environ.get("HF_TOKEN", "")
    return OpenAI(base_url=HF_BASE_URL, api_key=token)


def _mistral_client() -> OpenAI | None:
    key = os.environ.get("MISTRAL_API_KEY", "").strip()
    return OpenAI(base_url=MISTRAL_BASE_URL, api_key=key) if key else None


def has_mistral() -> bool:
    return bool(os.environ.get("MISTRAL_API_KEY", "").strip())


def _strip_thinking(text: str) -> str:
    """Remove <think>…</think> blocks emitted by Qwen3 thinking mode."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def has_qwen() -> bool:
    return bool(os.environ.get("HF_TOKEN", "").strip())


async def call_mistral_json_async(messages: list[dict], max_tokens: int = 1500) -> dict:
    """Mistral fallback for JSON generation — 2.25M TPM, JSON mode, no daily limit."""
    import json
    def _sync():
        client = _mistral_client()
        if not client:
            return {}
        resp = client.chat.completions.create(
            model=MISTRAL_MODEL,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        try:
            return json.loads(resp.choices[0].message.content or "{}")
        except json.JSONDecodeError:
            return {}
    return await asyncio.to_thread(_sync)


async def call_mistral_chat(messages: list[dict], max_tokens: int = 800) -> str:
    """Mistral fallback for streaming chat — returns full text string."""
    def _sync():
        client = _mistral_client()
        if not client:
            return ""
        resp = client.chat.completions.create(
            model=MISTRAL_MODEL,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.5,
        )
        return (resp.choices[0].message.content or "").strip()
    return await asyncio.to_thread(_sync)


async def call_qwen_chat(messages: list[dict], max_tokens: int = 600) -> str:
    """Groq fallback — uses Llama 3.1 8B via HF router. No thinking mode, ~2s latency."""
    def _sync():
        client = _client()
        resp = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.5,
        )
        return (resp.choices[0].message.content or "").strip()
    return await asyncio.to_thread(_sync)


async def call_llama_json_async(messages: list[dict], max_tokens: int = 2000) -> dict:
    """Llama 3.1-8B JSON call — no thinking mode, reliable JSON output, ~2s latency."""
    import json
    def _sync():
        client = _client()
        resp = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.3,
        )
        raw = (resp.choices[0].message.content or "").strip()
        if raw.startswith("```"):
            raw = "\n".join(raw.splitlines()[1:])
        if raw.endswith("```"):
            raw = raw[:raw.rfind("```")]
        start, end = raw.find("{"), raw.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(raw[start:end+1])
            except json.JSONDecodeError:
                pass
        return {}
    return await asyncio.to_thread(_sync)


async def call_qwen_json_async(messages: list[dict], max_tokens: int = 6000) -> dict:
    """Async Qwen JSON call — strips thinking, parses JSON. For insights fallback."""
    import json
    def _sync():
        client = _client()
        resp = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[
                {**messages[0], "content": messages[0]["content"]},
                {**messages[-1], "content": messages[-1]["content"] + " /no_think"},
            ],
            max_tokens=max_tokens,
            temperature=0.3,
        )
        raw = _strip_thinking(resp.choices[0].message.content or "")
        # Extract JSON from response
        start, end = raw.find("{"), raw.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(raw[start:end+1])
            except json.JSONDecodeError:
                pass
        return {}
    return await asyncio.to_thread(_sync)


def call_qwen(prompt: str, context: str, max_tokens: int = 6000) -> str:
    """Single-turn call — returns the model's text response.

    Qwen3.5-9B via Together AI uses thinking mode by default, consuming
    ~3-4k tokens for internal reasoning. max_tokens must be >=6000 to
    leave room for the actual answer after thinking.
    /no_think reduces but doesn't eliminate thinking overhead.
    """
    client = _client()
    resp = client.chat.completions.create(
        model=TEXT_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT + "\n\n" + context},
            {"role": "user",   "content": prompt + " /no_think"},
        ],
        max_tokens=max_tokens,
        temperature=0.4,
        top_p=0.9,
    )
    return _strip_thinking(resp.choices[0].message.content)
