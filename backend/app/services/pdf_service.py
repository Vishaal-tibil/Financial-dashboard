"""Report export (PLANNING §6.6). Renders an HTML report of the benchmark +
insights and converts to PDF via WeasyPrint. WeasyPrint needs native libs
(GTK/Pango); if unavailable we return the HTML so the endpoint never crashes."""
from __future__ import annotations

import datetime as _dt
from typing import Any, Optional

from .benchmark_service import build_benchmark
from .insight_service import get_insights


def _row(cells: list[str], tag: str = "td") -> str:
    return "<tr>" + "".join(f"<{tag}>{c}</{tag}>" for c in cells) + "</tr>"


def _build_html(bench: dict[str, Any], insights: dict[str, Any]) -> str:
    names = bench["companyNames"]
    your_name = names.get(bench["your_company_id"], "Your Company")
    now = _dt.datetime.utcnow().strftime("%d %b %Y")

    kpi_rows = "".join(
        _row([t["label"], t["display"], f"#{t['rank']} of {t['of']}" if t["rank"] else "—"])
        for t in bench["cockpit"]["kpis"]
    )
    margin_rows = "".join(
        _row([
            m["company"],
            f"{m['revenue']:,.0f}" if m["revenue"] else "—",
            f"{m['rawMaterialPct']:.1f}%" if m["rawMaterialPct"] is not None else "—",
            f"{m['employeePct']:.1f}%" if m["employeePct"] is not None else "—",
            f"{m['ebitdaPct']:.1f}%" if m["ebitdaPct"] is not None else "—",
        ])
        for m in bench["marginWaterfall"]
    )
    insight_items = "".join(
        f"<li><strong>{i['title']}.</strong> {i['body']}</li>" for i in insights.get("insights", [])
    )

    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
    body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color:#1f2937; margin:32px; }}
    h1 {{ color:#2D5BFF; font-size:24px; margin-bottom:0; }}
    .sub {{ color:#6b7280; margin-top:4px; }}
    h2 {{ color:#2D5BFF; font-size:14px; text-transform:uppercase; border-bottom:2px solid #e5e7eb; padding-bottom:4px; margin-top:28px; }}
    table {{ width:100%; border-collapse:collapse; font-size:12px; margin-top:8px; }}
    th,td {{ text-align:left; padding:6px 8px; border-bottom:1px solid #eee; }}
    th {{ background:#F5F7FB; }}
    ul {{ font-size:12px; line-height:1.6; }}
    .banner {{ background:#EEF2FF; border-left:3px solid #7C5CFC; padding:8px 12px; font-size:12px; margin-top:8px; }}
    </style></head><body>
    <h1>Competitor Intelligence Report</h1>
    <div class="sub">{your_name} vs {', '.join(n for cid, n in names.items() if cid != bench['your_company_id']) or '—'} · FY {bench.get('fiscal_year')} · Generated {now}</div>

    <h2>Executive Cockpit — Key KPIs</h2>
    <table><thead>{_row(['Metric', 'Value', 'Rank'], 'th')}</thead><tbody>{kpi_rows}</tbody></table>

    <h2>Margin Waterfall (TTM)</h2>
    <table><thead>{_row(['Company', 'Revenue ₹Cr', 'Raw Material %', 'Employee %', 'EBITDA %'], 'th')}</thead><tbody>{margin_rows}</tbody></table>

    <h2>AI Insights</h2>
    <ul>{insight_items or '<li>No insights generated.</li>'}</ul>
    {f'<div class="banner">{insights.get("capital_banner")}</div>' if insights.get("capital_banner") else ''}
    {f'<div class="banner">{insights.get("margin_banner")}</div>' if insights.get("margin_banner") else ''}
    </body></html>"""


async def build_report(your_id: str, competitor_ids: list[str], fiscal_year: Optional[str]) -> tuple[bytes, str]:
    """Returns (content_bytes, media_type). PDF if WeasyPrint is available, else HTML."""
    bench = build_benchmark(your_id, competitor_ids, fiscal_year)
    insights = await get_insights(your_id, competitor_ids, fiscal_year)
    html = _build_html(bench, insights)

    try:
        from weasyprint import HTML  # lazy import — native deps may be missing

        pdf = HTML(string=html).write_pdf()
        return pdf, "application/pdf"
    except Exception:
        return html.encode("utf-8"), "text/html"
