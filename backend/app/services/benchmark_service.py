"""Builds the benchmark payload (PLANNING §6.2) for a selected set of companies."""
from __future__ import annotations

import statistics
from typing import Any, Optional

from .metrics.engine import CompanyData, compute_company_metrics
from .store import get_company_data


# (key, label, unit, fmt, direction) — direction: higher/lower is better
KPI_STRIP = [
    ("revenue_growth_yoy", "Revenue Growth (YoY)", "%", "pct", "higher"),
    ("ebitda_margin_ttm", "EBITDA Margin (TTM)", "%", "pct", "higher"),
    ("roce_ttm_pct", "ROCE (TTM)", "%", "pct", "higher"),
    ("asset_turnover_ttm", "Asset Turnover (TTM)", "x", "mult", "higher"),
    ("inventory_turnover", "Inventory Turns (TTM)", "x", "mult", "higher"),
    ("cash_conversion_cycle", "Cash Conversion Cycle", "Days", "days", "lower"),
]

ALL_KPIS = KPI_STRIP + [
    ("pe", "P/E", "x", "mult", "lower"),
    ("roe_pct", "ROE", "%", "pct", "higher"),
    ("net_margin_pct", "Net Profit Margin", "%", "pct", "higher"),
    ("opm_pct", "Operating Margin", "%", "pct", "higher"),
    ("debt_to_equity", "Debt-to-Equity", "x", "mult", "lower"),
    ("interest_coverage", "Interest Coverage", "x", "mult", "higher"),
    ("revenue_cagr_5y", "Revenue CAGR (5Y)", "%", "pct", "higher"),
    ("revenue_cagr_3y", "Revenue CAGR (3Y)", "%", "pct", "higher"),
    ("pbt_margin_pct", "PBT Margin", "%", "pct", "higher"),
    ("effective_tax_rate", "Effective Tax Rate", "%", "pct", "lower"),
    ("eps", "EPS", "₹", "num", "higher"),
    ("dividend_payout_pct", "Dividend Payout", "%", "pct", "higher"),
    ("debtor_days", "Receivable Days", "Days", "days", "lower"),
    ("inventory_days", "Inventory Days", "Days", "days", "lower"),
    ("payable_days_approx", "Payable Days (approx)", "Days", "days", "higher"),
    ("price_to_book", "Price-to-Book", "x", "mult", "lower"),
    ("market_cap", "Market Cap", "₹ Cr", "cr", "higher"),
    ("free_cash_flow", "Free Cash Flow", "₹ Cr", "cr", "higher"),
    ("cash_conversion_ratio", "Cash Conversion Ratio", "x", "mult", "higher"),
]

# metrics not computable from Screener data
NA_METRICS = {
    "capacity_utilization": "Capacity Utilization (%)",
    "ebitda_per_employee": "EBITDA per Employee",
}


def _fmt(value: Optional[float], fmt: str) -> str:
    if value is None:
        return "—"
    if fmt == "pct":
        return f"{value * 100:.1f}%"
    if fmt == "mult":
        return f"{value:.2f}x"
    if fmt == "days":
        return f"{value:.0f} Days"
    if fmt == "cr":
        return f"₹{value:,.0f} Cr"
    if fmt == "num":
        return f"{value:.2f}"
    return f"{value:.2f}"


def _rank(values: dict[str, Optional[float]], your_id: str, direction: str) -> tuple[Optional[int], int]:
    present = [(cid, v) for cid, v in values.items() if v is not None]
    n = len(present)
    if your_id not in values or values[your_id] is None or n == 0:
        return None, n
    present.sort(key=lambda kv: kv[1], reverse=(direction == "higher"))
    for idx, (cid, _) in enumerate(present, start=1):
        if cid == your_id:
            return idx, n
    return None, n


def _all_metrics(ids: list[str], fy: Optional[str]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for cid in ids:
        data = get_company_data(cid)
        if data is None:
            continue
        out[cid] = compute_company_metrics(data, fy)
    return out


def build_benchmark(your_id: str, competitor_ids: list[str], fiscal_year: Optional[str]) -> dict[str, Any]:
    ids = [your_id] + [c for c in competitor_ids if c != your_id]
    computed = _all_metrics(ids, fiscal_year)
    if your_id not in computed:
        raise ValueError(f"Company '{your_id}' not found or not parsed.")

    your = computed[your_id]
    fy = your.get("fiscal_year")
    set_ids = list(computed.keys())

    def metric_map(key: str) -> dict[str, Optional[float]]:
        return {cid: computed[cid]["metrics"].get(key) for cid in set_ids}

    # ---------- cockpit + allKpis ----------
    def build_tiles(defs) -> list[dict[str, Any]]:
        tiles = []
        for key, label, unit, fmt, direction in defs:
            mm = metric_map(key)
            val = mm.get(your_id)
            rank, n = _rank(mm, your_id, direction)
            tiles.append(
                {
                    "key": key,
                    "label": label,
                    "value": val,
                    "display": _fmt(val, fmt),
                    "unit": unit,
                    "rank": rank,
                    "of": n,
                    "trend": "up" if (rank and n and rank <= (n + 1) // 2) else "down",
                    "direction": direction,
                    "is_na": False,
                }
            )
        return tiles

    cockpit_tiles = build_tiles(KPI_STRIP)
    all_kpis = build_tiles(ALL_KPIS)
    for na_key, na_label in NA_METRICS.items():
        all_kpis.append(
            {
                "key": na_key, "label": na_label, "value": None, "display": "N/A",
                "unit": "", "rank": None, "of": len(set_ids), "trend": None,
                "direction": "higher", "is_na": True,
                "note": "Not available in Screener data",
            }
        )

    # ---------- financial: radar + revenue trend ----------
    radar_axes = [
        ("roce_ttm_pct", "ROCE", "higher", "pct"),
        ("ebitda_margin_ttm", "EBITDA Margin", "higher", "pct"),
        ("revenue_growth_yoy", "Revenue Growth", "higher", "pct"),
        ("asset_turnover_ttm", "Asset Turnover", "higher", "mult"),
        ("cash_flow_to_sales", "Cash Flow to Sales", "higher", "pct"),
        ("net_margin_pct", "Net Profit Margin", "higher", "pct"),
        ("debt_ratio", "Debt Ratio", "lower", "pct"),
    ]
    radar = []
    for key, axis_label, direction, _fmtkey in radar_axes:
        mm = metric_map(key)
        present = [v for v in mm.values() if v is not None]
        best = (max(present) if direction == "higher" else min(present)) if present else None
        median = statistics.median(present) if present else None
        # normalize each to 0..100 for radar comparability
        max_abs = max((abs(v) for v in present), default=1) or 1

        def norm(v: Optional[float]) -> Optional[float]:
            if v is None:
                return None
            scaled = (v / max_abs) * 100
            if direction == "lower":
                scaled = 100 - scaled
            return round(scaled, 1)

        radar.append(
            {
                "axis": axis_label,
                "you": norm(mm.get(your_id)),
                "bestInSet": norm(best),
                "industryMedian": norm(median),
                "you_raw": mm.get(your_id),
            }
        )

    # revenue trend: per company, per FY
    all_periods = sorted({p for c in computed.values() for p in c.get("periods", [])})
    revenue_trend = []
    for p in all_periods:
        row: dict[str, Any] = {"period": p}
        for cid in set_ids:
            series = computed[cid].get("revenue_series", {})
            row[computed[cid]["company_name"]] = series.get(p)
        revenue_trend.append(row)

    series_names = [computed[cid]["company_name"] for cid in set_ids]

    # ---------- operational table ----------
    op_defs = [
        ("asset_turnover", "Asset Turnover (x)", "higher", "mult"),
        ("inventory_days", "Inventory Days", "lower", "days"),
        ("debtor_days", "Receivable Days", "lower", "days"),
        ("payable_days_approx", "Payable Days (approx)", "higher", "days"),
    ]
    op_rows = []
    for key, label, direction, fmt in op_defs:
        mm = metric_map(key)
        present = [v for v in mm.values() if v is not None]
        best = (max(present) if direction == "higher" else min(present)) if present else None
        median = statistics.median(present) if present else None
        you = mm.get(your_id)
        vs_best = (you - best) if (you is not None and best is not None) else None
        op_rows.append(
            {
                "kpi": label,
                "you": _fmt(you, fmt),
                "bestInSet": _fmt(best, fmt),
                "industryMedian": _fmt(median, fmt),
                "vsBest": _fmt(vs_best, fmt) if vs_best is not None else "—",
                "vsBestValue": vs_best,
                "direction": direction,
                "is_na": False,
            }
        )
    op_rows.append({"kpi": "Capacity Utilization (%)", "you": "N/A", "bestInSet": "N/A", "industryMedian": "N/A", "vsBest": "—", "vsBestValue": None, "direction": "higher", "is_na": True})
    op_rows.append({"kpi": "EBITDA per Employee", "you": "N/A", "bestInSet": "N/A", "industryMedian": "N/A", "vsBest": "—", "vsBestValue": None, "direction": "higher", "is_na": True})

    # ---------- capital efficiency bubbles ----------
    capital = []
    for cid in set_ids:
        m = computed[cid]["metrics"]
        capital.append(
            {
                "company": computed[cid]["company_name"],
                "company_id": cid,
                "capitalEmployed": m.get("capital_employed"),
                "ebitMargin": (m.get("ebit_margin_pct") * 100) if m.get("ebit_margin_pct") is not None else None,
                "revenue": m.get("ttm_sales") or m.get("sales"),
                "isYou": cid == your_id,
            }
        )

    # ---------- margin waterfall + gap panel ----------
    margin = []
    for cid in set_ids:
        m = computed[cid]["metrics"]
        margin.append(
            {
                "company": computed[cid]["company_name"],
                "company_id": cid,
                "revenue": m.get("ttm_sales") or m.get("sales"),
                "rawMaterialPct": (m.get("raw_material_pct") or 0) * 100 if m.get("raw_material_pct") is not None else None,
                "employeePct": (m.get("employee_pct") or 0) * 100 if m.get("employee_pct") is not None else None,
                "otherPct": (m.get("other_expenses_pct") or 0) * 100 if m.get("other_expenses_pct") is not None else None,
                "ebitdaPct": (m.get("ebitda_margin_ttm") or m.get("opm_pct") or 0) * 100 if (m.get("ebitda_margin_ttm") or m.get("opm_pct")) is not None else None,
                "isYou": cid == your_id,
            }
        )

    # best-in-set by EBITDA margin
    best_margin_row = max(
        (r for r in margin if r["ebitdaPct"] is not None),
        key=lambda r: r["ebitdaPct"],
        default=None,
    )
    your_margin_row = next((r for r in margin if r["company_id"] == your_id), None)
    gap_panel = None
    if best_margin_row and your_margin_row and best_margin_row["company_id"] != your_id:
        def diff(a, b):
            if a is None or b is None:
                return None
            return round(a - b, 1)
        gap_panel = {
            "best": best_margin_row["company"],
            "marginGap": diff(your_margin_row["ebitdaPct"], best_margin_row["ebitdaPct"]),
            "breakdown": [
                {"driver": "Raw Material Cost", "gap": diff(best_margin_row["rawMaterialPct"], your_margin_row["rawMaterialPct"])},
                {"driver": "Employee Cost", "gap": diff(best_margin_row["employeePct"], your_margin_row["employeePct"])},
                {"driver": "Other Expenses", "gap": diff(best_margin_row["otherPct"], your_margin_row["otherPct"])},
            ],
        }

    return {
        "your_company_id": your_id,
        "fiscal_year": fy,
        "cockpit": {"kpis": cockpit_tiles},
        "financial": {"radar": radar, "revenueTrend": revenue_trend, "seriesNames": series_names},
        "operational": {"rows": op_rows},
        "capitalEfficiency": capital,
        "marginWaterfall": margin,
        "marginGapPanel": gap_panel,
        "allKpis": all_kpis,
        "companyNames": {cid: computed[cid]["company_name"] for cid in set_ids},
    }
