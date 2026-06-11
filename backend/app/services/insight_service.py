"""AI Insights (PLANNING §6.3). Serializes benchmark metrics into a compact
text block, asks Groq for strict JSON, and provides a heuristic fallback when
the LLM is unavailable."""
from __future__ import annotations

import json
from typing import Any, Optional

from ..config import get_settings
from . import groq_client
from .benchmark_service import build_benchmark

# (set_key, fy) -> result
_CACHE: dict[str, dict[str, Any]] = {}


def _cache_key(your_id: str, comp_ids: list[str], fy: Optional[str]) -> str:
    return json.dumps([your_id, sorted(comp_ids), fy], sort_keys=True)


def _serialize(bench: dict[str, Any]) -> str:
    lines: list[str] = []
    names = bench["companyNames"]
    your_id = bench["your_company_id"]
    lines.append(f"Your company: {names.get(your_id)} (FY {bench.get('fiscal_year')})")
    lines.append("Companies in comparison set: " + ", ".join(names.values()))
    lines.append("\nKey metrics (your company):")
    for tile in bench["cockpit"]["kpis"]:
        lines.append(f"  - {tile['label']}: {tile['display']} (rank #{tile['rank']} of {tile['of']})")
    lines.append("\nCapital efficiency (company | capital employed ₹Cr | EBIT margin % | revenue ₹Cr):")
    for c in bench["capitalEfficiency"]:
        lines.append(f"  - {c['company']}: {c['capitalEmployed']} | {c['ebitMargin']} | {c['revenue']}")
    lines.append("\nMargin breakdown (company | rawmat% | employee% | other% | ebitda%):")
    for m in bench["marginWaterfall"]:
        lines.append(f"  - {m['company']}: {m['rawMaterialPct']} | {m['employeePct']} | {m['otherPct']} | {m['ebitdaPct']}")
    gap = bench.get("marginGapPanel")
    if gap:
        lines.append(f"\nMargin gap vs best-in-set ({gap['best']}): {gap['marginGap']}pp; "
                     + ", ".join(f"{b['driver']} {b['gap']}pp" for b in gap["breakdown"]))
    return "\n".join(lines)


SYSTEM = (
    "You are a competitive financial analyst. Given benchmark data for a company "
    "versus its competitors, identify the most decision-relevant insights. "
    "Return STRICT JSON only."
)


def _prompt(data_block: str) -> list[dict[str, Any]]:
    user = (
        f"{data_block}\n\n"
        "Return JSON exactly in this shape:\n"
        "{\n"
        '  "insights": [ {"icon": "trending-up|alert|cash|target", "title": "short title", '
        '"body": "one-sentence insight with numbers", "severity": "positive|warning|negative|info"} ],\n'
        '  "capital_banner": "one sentence on who has the best capital efficiency and why",\n'
        '  "margin_banner": "one sentence attributing the margin gap to its main cost driver"\n'
        "}\n"
        "Provide 4-6 insights covering: gaps vs the best performer, working-capital "
        "opportunities (in ₹ Cr where possible), margin drivers, and returns (ROCE/ROE)."
    )
    return [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": user},
    ]


def _heuristic(bench: dict[str, Any]) -> dict[str, Any]:
    """Fallback insights computed without the LLM."""
    insights = []
    your_id = bench["your_company_id"]
    names = bench["companyNames"]
    for tile in bench["cockpit"]["kpis"]:
        if tile["rank"] and tile["of"] and tile["of"] > 1:
            if tile["rank"] == 1:
                insights.append({
                    "icon": "trending-up", "title": f"Leads on {tile['label']}",
                    "body": f"{names.get(your_id)} ranks #1 of {tile['of']} on {tile['label']} at {tile['display']}.",
                    "severity": "positive",
                })
            elif tile["rank"] == tile["of"]:
                insights.append({
                    "icon": "alert", "title": f"Trails on {tile['label']}",
                    "body": f"{names.get(your_id)} ranks last (#{tile['rank']} of {tile['of']}) on {tile['label']} at {tile['display']}.",
                    "severity": "warning",
                })
    gap = bench.get("marginGapPanel")
    margin_banner = None
    if gap and gap.get("marginGap") is not None:
        worst = min(gap["breakdown"], key=lambda b: (b["gap"] if b["gap"] is not None else 0))
        margin_banner = (
            f"Margin gap of {gap['marginGap']}pp vs {gap['best']} is driven mainly by "
            f"{worst['driver']} ({worst['gap']}pp)."
        )
        insights.append({
            "icon": "target", "title": "Margin gap vs leader",
            "body": margin_banner, "severity": "warning",
        })
    cap = bench.get("capitalEfficiency", [])
    cap_present = [c for c in cap if c.get("ebitMargin") is not None and c.get("capitalEmployed")]
    capital_banner = None
    if cap_present:
        best = max(cap_present, key=lambda c: (c["ebitMargin"] or 0) / (c["capitalEmployed"] or 1))
        capital_banner = (
            f"{best['company']} shows the best capital efficiency — {best['ebitMargin']:.1f}% EBIT margin "
            f"on ₹{best['capitalEmployed']:,.0f} Cr capital employed."
        )
    return {
        "insights": insights[:6] or [{
            "icon": "info", "title": "Add competitors",
            "body": "Select one or more competitors to generate comparative insights.",
            "severity": "info",
        }],
        "capital_banner": capital_banner,
        "margin_banner": margin_banner,
        "generated": False,
    }


async def get_insights(your_id: str, competitor_ids: list[str], fiscal_year: Optional[str]) -> dict[str, Any]:
    key = _cache_key(your_id, competitor_ids, fiscal_year)
    if key in _CACHE:
        return _CACHE[key]

    bench = build_benchmark(your_id, competitor_ids, fiscal_year)
    settings = get_settings()

    if not settings.has_groq:
        result = _heuristic(bench)
        _CACHE[key] = result
        return result

    try:
        data_block = _serialize(bench)
        raw = await groq_client.complete_json(_prompt(data_block))
        if not raw or "insights" not in raw:
            result = _heuristic(bench)
        else:
            result = {
                "insights": raw.get("insights", [])[:6],
                "capital_banner": raw.get("capital_banner"),
                "margin_banner": raw.get("margin_banner"),
                "generated": True,
            }
    except Exception as exc:
        result = _heuristic(bench)
        result["error"] = str(exc)

    _CACHE[key] = result
    return result
