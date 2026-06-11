"""
context_builder.py — reads companies.json + metrics.json → plain-text context
injected into every LLM prompt (same role as build_context_string in old dashboard)
"""
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"


def _read(name: str):
    f = DATA_DIR / f"{name}.json"
    if not f.exists():
        return None
    try:
        return json.loads(f.read_text(encoding="utf-8"))
    except Exception:
        return None


def build_context() -> str:
    companies = _read("companies") or []
    metrics   = _read("metrics")   or {}
    meta      = _read("meta")      or {}

    if not companies:
        return "No financial data loaded."

    lines = [
        f"=== FINANCIAL DASHBOARD — {meta.get('company_count', len(companies))} Companies ===",
        f"Latest Year: {meta.get('latest_year', 'N/A')}",
        "",
        "--- KPI SUMMARY (Latest Year) ---",
    ]

    # KPI summary table
    headers = ["Company", "Rev Growth%", "EBITDA%", "ROCE%", "AssetTurn", "InvDays", "CCC", "D/E"]
    lines.append("  ".join(f"{h:<14}" for h in headers))

    for c in companies:
        row = [
            c.get("name", "")[:14],
            f"{c.get('rev_growth') or 0:.1f}%",
            f"{c.get('ebitda_margin') or 0:.1f}%",
            f"{c.get('roce') or 0:.1f}%",
            f"{c.get('asset_turn') or 0:.2f}x",
            f"{c.get('inv_days') or 0:.0f}d",
            f"{c.get('ccc') or 0:.0f}d",
            f"{c.get('debt_equity') or 0:.2f}x",
        ]
        lines.append("  ".join(f"{v:<14}" for v in row))

    lines.append("")

    # Per-company time series (last 5 years)
    for c in companies:
        name = c["name"]
        m    = metrics.get(name, {})
        yrs  = (m.get("years") or [])[-5:]
        if not yrs:
            continue

        def ts(key):
            vals = (m.get(key) or [])[-len(yrs):]
            return ", ".join(
                f"{y}:{round(v, 1) if v is not None else 'N/A'}"
                for y, v in zip(yrs, vals)
            )

        lines += [
            f"--- {name} ---",
            f"  Revenue (₹Cr):      {ts('sales')}",
            f"  EBITDA Margin (%):  {ts('ebitda_margin')}",
            f"  Net Profit (₹Cr):   {ts('net_profit')}",
            f"  ROCE (%):           {ts('roce')}",
            f"  FCF (₹Cr):         {ts('fcf')}",
            f"  Inventory Days:     {ts('inv_days')}",
            "",
        ]

    return "\n".join(lines)
