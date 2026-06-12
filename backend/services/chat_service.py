"""
AI Chat Assistant service.
Reads company data from Dev 1's companies.json, builds a system prompt,
runs a Groq tool-call loop (web_search via Tavily), then streams the answer via SSE.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, AsyncIterator, Optional

from . import groq_client
from .tavily_client import search_general

DATA_DIR = Path(__file__).parent.parent / "data"

# session_id -> list of message dicts (bounded to last 12)
_SESSIONS: dict[str, list[dict]] = {}

WEB_SEARCH_TOOL = {
    "type": "function",
    "function": {
        "name": "web_search",
        "description": "Search the web for recent news or facts not present in the financial data.",
        "parameters": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
}

# Keywords that signal the user wants live/external information (not loaded data)
_SEARCH_KEYWORDS = frozenset([
    'news', 'recent', 'latest', 'today', 'yesterday', 'this week',
    'announce', 'announced', 'result', 'quarter', 'q1', 'q2', 'q3', 'q4',
    'stock price', 'share price', 'market cap', 'press release', 'current',
])

def _needs_web_search(question: str) -> bool:
    q = question.lower()
    return any(k in q for k in _SEARCH_KEYWORDS)


def reset_session(session_id: str) -> None:
    _SESSIONS.pop(session_id, None)


def _load_companies() -> list[dict]:
    p = DATA_DIR / "companies.json"
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return []


def _compact_company(company_name: str) -> Optional[str]:
    """Serialize one company's KPIs into a compact string for the LLM prompt."""
    companies = _load_companies()
    c = next((x for x in companies if x["name"] == company_name), None)
    if not c:
        return None

    fields = {
        "Revenue_Cr":    c.get("wf_sales"),
        "EBITDA_Margin": c.get("ebitda_margin"),
        "EBIT_Margin":   c.get("op_margin"),
        "Net_Margin":    c.get("net_margin"),
        "ROCE":          c.get("roce"),
        "ROE":           c.get("roe"),
        "Asset_Turn":    c.get("asset_turn"),
        "Inv_Turns":     c.get("inv_turns"),
        "CCC_days":      c.get("ccc"),
        "CFO_Sales":     c.get("cfo_to_sales"),
        "Cap_Employed":  c.get("cap_employed"),
        "D_E":           c.get("debt_equity"),
        "Rev_Growth":    c.get("rev_growth"),
        "Rev_CAGR_3y":   c.get("rev_cagr_3"),
        "PE":            c.get("pe_ratio"),
    }
    parts = [f"{k}={v}" for k, v in fields.items() if v is not None]
    fy = c.get("latest_year", "N/A")
    return f"{company_name} (FY{fy}): " + ", ".join(parts)


def _build_system(your_company: Optional[str], competitors: list[str]) -> str:
    # Compact KPI snapshot for selected companies
    blocks: list[str] = []
    if your_company:
        b = _compact_company(your_company)
        if b:
            blocks.append("YOUR COMPANY — " + b)
    for name in competitors:
        b = _compact_company(name)
        if b:
            blocks.append("COMPETITOR — " + b)
    data_block = "\n".join(blocks) if blocks else "No company data selected."

    # 5-year time series from the full context builder
    try:
        import sys
        sys.path.insert(0, str(DATA_DIR.parent))
        from context_builder import build_context
        full_ctx = build_context()
        if full_ctx == "No financial data loaded.":
            full_ctx = ""
    except Exception:
        full_ctx = ""

    time_series_section = (
        f"\n\n[HISTORICAL DATA — last 5 years for all companies]\n{full_ctx}"
        if full_ctx else ""
    )

    return (
        "You are FinBot, an expert financial analyst specialising in Indian industrial "
        "companies. You have BOTH latest-year KPI snapshots AND 5-year historical time series below. "
        "Use the historical data to answer trend questions. "
        "Answer concisely. Cite specific numbers and years. "
        "Percentages are in % form (e.g. 11.1 means 11.1%). Revenue in ₹ Cr.\n\n"
        f"[LATEST YEAR KPIs — selected companies]\n{data_block}"
        f"{time_series_section}"
    )


async def stream_chat(
    question: str,
    your_company: Optional[str],
    competitors: list[str],
    session_id: str,
) -> AsyncIterator[dict[str, Any]]:
    history = _SESSIONS.setdefault(session_id, [])

    if not groq_client.has_groq():
        yield {"type": "token", "text": "AI Assistant not configured — add GROQ_API_KEY to FD/.env and restart the backend."}
        yield {"type": "done"}
        return

    system = _build_system(your_company, competitors)
    messages: list[dict] = [{"role": "system", "content": system}]
    messages.extend(history)
    messages.append({"role": "user", "content": question})

    # Only run the blocking tool-call round trip when the question needs live data.
    # For purely analytical questions (90%+ of usage), skip straight to streaming.
    if _needs_web_search(question):
        for _ in range(3):
            try:
                assistant_msg = await groq_client.complete_with_tools(messages, [WEB_SEARCH_TOOL])
            except Exception as exc:
                yield {"type": "error", "message": f"LLM error: {exc}"}
                yield {"type": "done"}
                return

            if assistant_msg is None:
                break
            tool_calls = getattr(assistant_msg, "tool_calls", None)
            if not tool_calls:
                # Model decided not to use tools — use its text response directly
                if assistant_msg.content:
                    messages.append({"role": "assistant", "content": assistant_msg.content})
                break

            messages.append({
                "role":       "assistant",
                "content":    assistant_msg.content or "",
                "tool_calls": [
                    {"id": tc.id, "type": "function",
                     "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                    for tc in tool_calls
                ],
            })

            for tc in tool_calls:
                if tc.function.name == "web_search":
                    try:
                        args = json.loads(tc.function.arguments or "{}")
                    except Exception:
                        args = {}
                    query = args.get("query", question)
                    yield {"type": "tool", "query": query}
                    result   = await search_general(query, max_results=5)
                    summary  = result.get("answer") or ""
                    snippets = "\n".join(
                        f"- {r.get('title')}: {r.get('content','')[:300]}"
                        for r in result.get("results", [])[:5]
                    )
                    tool_content = f"{summary}\n{snippets}".strip() or "No results."
                    messages.append({
                        "role": "tool", "tool_call_id": tc.id,
                        "name": "web_search", "content": tool_content[:4000],
                    })

    # Stream final answer — try Groq first, fall back to Qwen on rate limit
    answer_parts: list[str] = []
    try:
        async for token in groq_client.stream_completion(messages):
            answer_parts.append(token)
            yield {"type": "token", "text": token}
    except Exception as exc:
        if isinstance(exc, groq_client.RateLimitError) or "429" in str(exc):
            # Groq rate limited — fall back to Qwen via HuggingFace
            try:
                from ai_client import call_qwen_chat, has_qwen
                if not has_qwen():
                    yield {"type": "error", "message": "Groq rate limit reached and no HF_TOKEN configured."}
                    yield {"type": "done"}
                    return
                yield {"type": "status", "text": "Groq limit reached — switching to fallback AI…"}
                text = await call_qwen_chat(messages)
                if text:
                    yield {"type": "token", "text": text}
                    answer_parts = [text]
                else:
                    yield {"type": "error", "message": "Qwen returned an empty response."}
                    yield {"type": "done"}
                    return
            except Exception as qexc:
                yield {"type": "error", "message": f"Qwen fallback failed: {qexc}"}
                yield {"type": "done"}
                return
        else:
            yield {"type": "error", "message": f"Streaming error: {exc}"}
            yield {"type": "done"}
            return

    full_answer = "".join(answer_parts)
    history.append({"role": "user",      "content": question})
    history.append({"role": "assistant", "content": full_answer})
    if len(history) > 12:
        del history[:-12]

    yield {"type": "done"}
