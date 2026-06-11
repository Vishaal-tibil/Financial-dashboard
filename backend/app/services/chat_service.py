"""Ask AI Assistant (PLANNING §6.5): system prompt with serialized company
data, Groq tool-loop (web_search via Tavily), SSE streaming of the final
answer, and per-session memory."""
from __future__ import annotations

import json
from typing import Any, AsyncIterator, Optional

from ..config import get_settings
from . import groq_client
from .metrics.engine import compute_company_metrics
from .store import get_company_data, get_parsed
from .tavily_client import search_general

# session_id -> list[message dict]
_SESSIONS: dict[str, list[dict[str, Any]]] = {}

WEB_SEARCH_TOOL = {
    "type": "function",
    "function": {
        "name": "web_search",
        "description": "Search the web for recent, real-world information (news, prices, events) not present in the provided financial data.",
        "parameters": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "The search query"}},
            "required": ["query"],
        },
    },
}


def reset_session(session_id: str) -> None:
    _SESSIONS.pop(session_id, None)


def _compact_company(company_id: str) -> Optional[str]:
    data = get_company_data(company_id)
    if data is None:
        return None
    m = compute_company_metrics(data, None)
    metrics = m["metrics"]
    keep = [
        "sales", "operating_profit", "opm_pct", "ebitda_margin_ttm", "net_margin_pct",
        "roce_ttm_pct", "roe_pct", "asset_turnover_ttm", "inventory_turnover",
        "cash_conversion_cycle", "debt_to_equity", "interest_coverage", "pe",
        "market_cap", "revenue_growth_yoy", "revenue_cagr_5y", "free_cash_flow",
    ]
    parts = [f"{k}={round(metrics[k], 3) if isinstance(metrics.get(k), float) else metrics.get(k)}" for k in keep if metrics.get(k) is not None]
    return f"{m['company_name']} (FY {m['fiscal_year']}): " + ", ".join(parts)


def _build_system(your_id: Optional[str], competitor_ids: list[str]) -> str:
    blocks = []
    if your_id:
        b = _compact_company(your_id)
        if b:
            blocks.append("YOUR COMPANY — " + b)
    for cid in competitor_ids:
        b = _compact_company(cid)
        if b:
            blocks.append("COMPETITOR — " + b)
    data_block = "\n".join(blocks) if blocks else "No company data selected."
    return (
        "You are a financial analyst assistant embedded in a competitor-intelligence "
        "dashboard. Answer concisely using the provided data. Use the web_search tool "
        "only when the question needs current external facts not in the data. "
        "Cite specific numbers when relevant.\n\n"
        f"=== SELECTED COMPANY DATA (₹ Cr, ratios as decimals) ===\n{data_block}\n=== END DATA ==="
    )


async def stream_chat(
    question: str, your_id: Optional[str], competitor_ids: list[str], session_id: str
) -> AsyncIterator[dict[str, Any]]:
    settings = get_settings()
    history = _SESSIONS.setdefault(session_id, [])

    if not settings.has_groq:
        msg = "(LLM not configured — set GROQ_API_KEY in backend/.env to enable the assistant.)"
        yield {"type": "token", "text": msg}
        yield {"type": "done"}
        return

    system = _build_system(your_id, competitor_ids)
    messages: list[dict[str, Any]] = [{"role": "system", "content": system}]
    messages.extend(history)
    messages.append({"role": "user", "content": question})

    # --- tool-decision turn(s) ---
    tools_used = False
    for _ in range(3):  # cap tool iterations
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
            break
        # record the assistant turn requesting tools
        messages.append({
            "role": "assistant",
            "content": assistant_msg.content or "",
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
                yield {"type": "tool", "name": "web_search", "query": query}
                tools_used = True
                result = await search_general(query, max_results=5)
                summary = result.get("answer") or ""
                snippets = "\n".join(
                    f"- {r.get('title')}: {r.get('content', '')[:300]}" for r in result.get("results", [])[:5]
                )
                tool_content = f"{summary}\n{snippets}".strip() or "No results."
                messages.append({"role": "tool", "tool_call_id": tc.id, "name": "web_search", "content": tool_content[:4000]})

    # --- stream final answer ---
    answer_parts: list[str] = []
    async for token in groq_client.stream_completion(messages):
        answer_parts.append(token)
        yield {"type": "token", "text": token}

    full_answer = "".join(answer_parts)
    history.append({"role": "user", "content": question})
    history.append({"role": "assistant", "content": full_answer})
    # keep memory bounded
    if len(history) > 12:
        del history[:-12]
    yield {"type": "done", "tools_used": tools_used}
