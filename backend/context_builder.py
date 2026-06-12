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
    headers = ["Company", "Rev%YoY", "EBITDA%", "ROCE%", "NetM%", "AssetTurn", "InvTurns", "CCC", "CFO/Sales", "D/E"]
    lines.append("  ".join(f"{h:<13}" for h in headers))

    for c in companies:
        row = [
            c.get("name", "")[:13],
            f"{c.get('rev_growth') or 0:.1f}%",
            f"{c.get('ebitda_margin') or 0:.1f}%",
            f"{c.get('roce') or 0:.1f}%",
            f"{c.get('net_margin') or 0:.1f}%",
            f"{c.get('asset_turn') or 0:.2f}x",
            f"{c.get('inv_turns') or 0:.1f}x",
            f"{c.get('ccc') or 0:.0f}d",
            f"{c.get('cfo_to_sales') or 0:.1f}%",
            f"{c.get('debt_equity') or 0:.2f}x",
        ]
        lines.append("  ".join(f"{v:<13}" for v in row))

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

        # Quarterly labels + metrics (if available)
        q_labels = m.get("q_labels") or []
        q_sales  = m.get("q_sales")  or []
        q_opm    = m.get("q_opm")    or []
        q_net    = m.get("q_net")    or []
        q_line = ""
        if q_labels and q_sales:
            def _fmt(v, dec=1):
                return f"{round(v, dec)}" if v is not None else "N/A"
            q_parts = [f"{lbl}:Rev={_fmt(s)},OPM={_fmt(p)}%,NP={_fmt(n)}"
                       for lbl, s, p, n in zip(q_labels, q_sales, q_opm, q_net)]
            q_line = f"  Recent Quarters:    {', '.join(q_parts)}"

        lines += [
            f"--- {name} ---",
            f"  Revenue (Rs Cr):    {ts('sales')}",
            f"  EBITDA Margin (%):  {ts('ebitda_margin')}",
            f"  Op/EBIT Margin (%): {ts('op_margin')}",
            f"  Net Margin (%):     {ts('net_margin')}",
            f"  ROCE (%):           {ts('roce')}",
            f"  ROE (%):            {ts('roe')}",
            f"  Asset Turn (x):     {ts('asset_turn')}",
            f"  D/E Ratio (x):      {ts('debt_equity')}",
            f"  Inv Days:           {ts('inv_days')}",
            f"  Debtor Days:        {ts('debtor_days')}",
            f"  CCC (days):         {ts('ccc')}",
            f"  FCF (Rs Cr):        {ts('fcf')}",
            f"  CAPEX (Rs Cr):      {ts('capex')}",
            f"  Inv Turns (x):      {ts('inv_turns')}",
            f"  CFO/Sales (%):      {ts('cfo_to_sales')}",
            f"  P/E Ratio:          {ts('pe_ratio')}",
            f"  EV/EBITDA:          {ts('ev_ebitda')}",
        ]
        if q_line:
            lines.append(q_line)
        lines.append("")

    return "\n".join(lines)
