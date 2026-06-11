"""
extract.py — Excel → JSON pipeline
Usage: python extract.py <xlsx_path> <data_dir> <original_name>
Outputs: data_dir/{meta,companies,metrics}.json
Accumulates: uploading a second company ADDS to existing data (no overwrite)
"""
import sys, os, json, math
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import openpyxl

COLORS = ["#4C9EEB", "#F4A261", "#2EC4B6", "#E76F51", "#A8DADC", "#9b59b6", "#f1c40f", "#e74c3c"]

def out(stage, message, pct=None):
    obj = {"stage": stage, "message": message}
    if pct is not None:
        obj["pct"] = pct
    print(json.dumps(obj), flush=True)

def sf(v):
    try:
        f = float(v)
        return None if (math.isnan(f) or math.isinf(f)) else round(f, 2)
    except:
        return None

def to_list(s):
    return [sf(v) for v in s.values]

def last(lst):
    vals = [v for v in lst if v is not None]
    return vals[-1] if vals else None

def cagr(vals, years_list, n):
    pairs = [(y, v) for y, v in zip(years_list, vals) if v is not None]
    if len(pairs) < n + 1:
        return None
    end_v, start_v = pairs[-1][1], pairs[-1 - n][1]
    if start_v <= 0:
        return None
    return round(((end_v / start_v) ** (1 / n) - 1) * 100, 1)

def yoy_growth(vals):
    valid = [v for v in vals if v is not None]
    if len(valid) < 2 or valid[-2] == 0:
        return None
    return round((valid[-1] / valid[-2] - 1) * 100, 1)

def _col_offset(row_vals, max_scan=11):
    """Return the 0-based offset of the first non-None value in row_vals[1:max_scan]."""
    for i, v in enumerate(row_vals[1:max_scan]):
        if v is not None:
            return i
    return 0


def parse_excel(path: str) -> dict:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb["Data Sheet"]
    rows = {i + 1: list(row) for i, row in enumerate(ws.iter_rows(values_only=True))}
    wb.close()

    def rv(r): return list(rows.get(r, [None] * 12))

    company_name  = rv(1)[1] or Path(path).stem
    current_price = sf(rv(8)[1])
    market_cap    = sf(rv(9)[1])

    # ── Annual section — detect right-alignment ──────────────────────────────
    ann_offset   = _col_offset(rv(16))          # 0-based offset within rv[1:11]
    annual_raw   = [v for v in rv(16)[1+ann_offset:11] if v is not None]
    annual_dates = pd.to_datetime(annual_raw)
    years        = [d.year for d in annual_dates]

    def ser(r, idx):
        """Read annual series starting at the detected column offset."""
        return pd.Series(rv(r)[1+ann_offset:1+ann_offset+len(idx)], index=idx, dtype=float)

    sales      = ser(17, years)
    raw_mat    = ser(18, years)
    chg_inv    = ser(19, years)
    power_fuel = ser(20, years)
    other_mfr  = ser(21, years)
    emp_cost   = ser(22, years)
    selling    = ser(23, years)
    other_exp  = ser(24, years)
    deprec     = ser(26, years)
    net_profit = ser(30, years)

    total_exp  = (raw_mat.fillna(0) + chg_inv.fillna(0) + power_fuel.fillna(0) +
                  other_mfr.fillna(0) + emp_cost.fillna(0) + selling.fillna(0) +
                  other_exp.fillna(0))
    op_profit  = sales - total_exp
    ebitda     = op_profit + deprec.fillna(0)
    ebit       = ebitda - deprec.fillna(0)

    safe_sales    = sales.replace(0, np.nan)
    ebitda_margin = (ebitda / safe_sales * 100).round(2)
    net_margin    = (net_profit / safe_sales * 100).round(2)
    op_margin     = (op_profit / safe_sales * 100).round(2)

    # ── Quarterly section ─────────────────────────────────────────────────────
    q_offset = _col_offset(rv(41))
    q_raw    = rv(41)[1+q_offset:11]
    q_dates  = pd.to_datetime([v for v in q_raw if v is not None])
    q_labels = [d.strftime("%b'%y") for d in q_dates]
    n_q      = len(q_labels)

    def qser(r):
        return pd.Series(rv(r)[1+q_offset:1+q_offset+n_q], index=q_labels, dtype=float)

    q_sales = qser(42)
    q_op    = qser(50)
    q_net   = qser(49)
    q_opm   = (q_op / q_sales.replace(0, np.nan) * 100).round(2)

    # ── Balance sheet — detect right-alignment ───────────────────────────────
    bs_offset = _col_offset(rv(56))
    bs_raw    = rv(56)[1+bs_offset:11]
    bs_years  = [pd.to_datetime(v).year for v in bs_raw if v is not None]

    def bser(r):
        return pd.Series(rv(r)[1+bs_offset:1+bs_offset+len(bs_years)], index=bs_years, dtype=float)

    share_cap  = bser(57)
    reserves   = bser(58)
    borrowings = bser(59)
    total_liab = bser(61)
    receivable = bser(67)
    inventory  = bser(68)
    cash_bank  = bser(69)
    shares_cr  = bser(93)   # Adjusted Equity Shares in Crores

    equity      = share_cap + reserves
    safe_equity = equity.replace(0, np.nan)
    debt_equity = (borrowings / safe_equity).round(2)
    cap_employ  = equity + borrowings
    roce        = (ebit.reindex(bs_years) / cap_employ.replace(0, np.nan) * 100).round(2)
    roe         = (net_profit.reindex(bs_years) / safe_equity * 100).round(2)

    safe_sales_bs = sales.reindex(bs_years).replace(0, np.nan)
    inv_days    = (inventory / safe_sales_bs * 365).round(1)
    debtor_days = (receivable / safe_sales_bs * 365).round(1)
    ccc         = (inv_days + debtor_days).round(1)
    asset_turn  = (sales.reindex(bs_years) / total_liab.replace(0, np.nan)).round(2)

    # ── Cash flow — detect right-alignment ───────────────────────────────────
    cf_offset = _col_offset(rv(81))
    cf_raw    = rv(81)[1+cf_offset:11]
    cf_years  = [pd.to_datetime(v).year for v in cf_raw if v is not None]

    def cfser(r):
        return pd.Series(rv(r)[1+cf_offset:1+cf_offset+len(cf_years)], index=cf_years, dtype=float)

    cfo   = cfser(82)
    cfi   = cfser(83)
    cff   = cfser(84)
    capex = cfi.abs()
    fcf   = cfo - capex

    # ── Prices (use annual offset) ────────────────────────────────────────────
    prices = pd.Series(rv(90)[1+ann_offset:1+ann_offset+len(years)], index=years, dtype=float)

    # ── Valuation metrics ─────────────────────────────────────────────────────
    safe_shares = shares_cr.reindex(years).replace(0, np.nan)
    eps         = (net_profit / safe_shares).round(2)
    bvps        = (equity.reindex(bs_years) / shares_cr.replace(0, np.nan)).round(2)

    safe_eps  = eps.replace(0, np.nan)
    pe_ratio  = (prices / safe_eps).round(1)
    pb_ratio  = (prices.reindex(bs_years) / bvps.replace(0, np.nan)).round(2)

    net_debt  = borrowings - cash_bank
    mc        = market_cap if market_cap is not None else 0.0
    ev        = (mc + net_debt.reindex(years).fillna(0)).round(0)
    safe_ebit = ebitda.replace(0, np.nan)
    ev_ebitda = (ev / safe_ebit).round(1)

    # ── Also store P&L components for waterfall chart ─────────────────────────
    raw_mat_last    = last(to_list(raw_mat))
    emp_cost_last   = last(to_list(emp_cost))
    other_opex_last = last(to_list(chg_inv.fillna(0) + power_fuel.fillna(0) + other_mfr.fillna(0) + selling.fillna(0) + other_exp.fillna(0)))
    deprec_last     = last(to_list(deprec))
    # interest from P&L row 27 if available
    interest_row    = ser(27, years) if 27 in rows else pd.Series(dtype=float)
    tax_row         = ser(29, years) if 29 in rows else pd.Series(dtype=float)
    interest_last   = last(to_list(interest_row)) if len(interest_row) else None
    tax_last        = last(to_list(tax_row))        if len(tax_row)      else None
    sales_last      = last(to_list(sales))

    # ── Build list versions ───────────────────────────────────────────────────
    sales_l         = to_list(sales)
    ebitda_margin_l = to_list(ebitda_margin)
    roce_l          = to_list(roce)
    asset_turn_l    = to_list(asset_turn)
    inv_days_l      = to_list(inv_days)
    ccc_l           = to_list(ccc)
    roe_l           = to_list(roe)
    net_margin_l    = to_list(net_margin)
    debt_equity_l   = to_list(debt_equity)
    fcf_l           = to_list(fcf)
    pe_l            = to_list(pe_ratio)
    pb_l            = to_list(pb_ratio)
    ev_ebitda_l     = to_list(ev_ebitda)

    return {
        "company":       company_name,
        "current_price": current_price,
        "market_cap":    market_cap,
        "latest_year":   years[-1] if years else None,
        # KPI scalars (latest year) — prefixed _kpi to avoid collision with time series
        "rev_growth":        yoy_growth(sales_l),
        "ebitda_margin_kpi": last(ebitda_margin_l),
        "op_margin_kpi":     last(to_list(op_margin)),
        "roce_kpi":          last(roce_l),
        "asset_turn_kpi":    last(asset_turn_l),
        "inv_days_kpi":      last(inv_days_l),
        "debtor_days_kpi":   last(to_list(debtor_days)),
        "ccc_kpi":           last(ccc_l),
        "roe_kpi":           last(roe_l),
        "net_margin_kpi":    last(net_margin_l),
        "debt_equity_kpi":   last(debt_equity_l),
        "fcf_kpi":           last(fcf_l),
        "rev_cagr_3":        cagr(sales_l, years, 3),
        "rev_cagr_5":        cagr(sales_l, years, 5),
        "pe_kpi":            last(pe_l),
        "pb_kpi":            last(pb_l),
        "ev_ebitda_kpi":     last(ev_ebitda_l),
        # Waterfall P&L scalars (latest year)
        "wf_sales":       sales_last,
        "wf_raw_mat":     raw_mat_last,
        "wf_emp_cost":    emp_cost_last,
        "wf_other_opex":  other_opex_last,
        "wf_deprec":      deprec_last,
        "wf_interest":    interest_last,
        "wf_tax":         tax_last,
        # Time series for charts
        "years":         years,
        "sales":         sales_l,
        "ebitda":        to_list(ebitda),
        "ebitda_margin": ebitda_margin_l,
        "net_profit":    to_list(net_profit),
        "net_margin":    net_margin_l,
        "op_margin":     to_list(op_margin),
        "roce":          roce_l,
        "roe":           roe_l,
        "debt_equity":   debt_equity_l,
        "inv_days":      inv_days_l,
        "debtor_days":   to_list(debtor_days),
        "ccc":           ccc_l,
        "asset_turn":    asset_turn_l,
        "fcf":           fcf_l,
        "cfo":           to_list(cfo),
        "cfi":           to_list(cfi),
        "cff":           to_list(cff),
        "capex":         to_list(capex),
        "prices":        to_list(prices),
        "pe_ratio":      pe_l,
        "pb_ratio":      pb_l,
        "ev_ebitda":     ev_ebitda_l,
        "q_labels":      q_labels,
        "q_sales":       to_list(q_sales),
        "q_op":          to_list(q_op),
        "q_net":         to_list(q_net),
        "q_opm":         to_list(q_opm),
    }


def add_ranks(companies):
    n = len(companies)
    metrics_higher = ["rev_growth", "ebitda_margin", "roce", "roe", "net_margin", "asset_turn", "fcf"]
    metrics_lower  = ["inv_days", "ccc", "debt_equity"]

    for metric in metrics_higher + metrics_lower:
        vals = [(c["name"], c.get(metric)) for c in companies]
        vals = [(nm, v) for nm, v in vals if v is not None and v == v]
        reverse = metric in metrics_higher
        sorted_vals = sorted(vals, key=lambda x: x[1], reverse=reverse)
        rank_map = {nm: i + 1 for i, (nm, _) in enumerate(sorted_vals)}
        for c in companies:
            if "ranks" not in c:
                c["ranks"] = {}
            if c["name"] in rank_map:
                c["ranks"][metric] = {"rank": rank_map[c["name"]], "of": n}
    return companies


def main():
    if len(sys.argv) < 3:
        out("error", "Usage: extract.py <file> <data_dir>")
        sys.exit(1)

    file_path = sys.argv[1]
    data_dir  = sys.argv[2]
    os.makedirs(data_dir, exist_ok=True)

    companies_path = os.path.join(data_dir, "companies.json")
    metrics_path   = os.path.join(data_dir, "metrics.json")
    meta_path      = os.path.join(data_dir, "meta.json")

    existing_cos  = json.load(open(companies_path)) if os.path.exists(companies_path) else []
    existing_mets = json.load(open(metrics_path))   if os.path.exists(metrics_path)   else {}

    out("processing", "Parsing Excel file…", pct=20)
    try:
        data = parse_excel(file_path)
    except Exception as e:
        out("error", f"Excel parse failed: {e}")
        sys.exit(1)

    name = data["company"]
    out("computing", f"Computing metrics for {name}…", pct=60)

    used  = {c.get("color") for c in existing_cos}
    color = next((c for c in COLORS if c not in used), COLORS[0])

    company_obj = {
        "name":          name,
        "color":         color,
        "current_price": data["current_price"],
        "market_cap":    data["market_cap"],
        "latest_year":   data["latest_year"],
        "rev_growth":    data["rev_growth"],
        "ebitda_margin": data["ebitda_margin_kpi"],
        "op_margin":     data["op_margin_kpi"],
        "roce":          data["roce_kpi"],
        "asset_turn":    data["asset_turn_kpi"],
        "inv_days":      data["inv_days_kpi"],
        "debtor_days":   data["debtor_days_kpi"],
        "ccc":           data["ccc_kpi"],
        "roe":           data["roe_kpi"],
        "net_margin":    data["net_margin_kpi"],
        "debt_equity":   data["debt_equity_kpi"],
        "fcf":           data["fcf_kpi"],
        "rev_cagr_3":    data["rev_cagr_3"],
        "rev_cagr_5":    data["rev_cagr_5"],
        "pe_ratio":      data["pe_kpi"],
        "pb_ratio":      data["pb_kpi"],
        "ev_ebitda":     data["ev_ebitda_kpi"],
        # Waterfall P&L scalars
        "wf_sales":      data["wf_sales"],
        "wf_raw_mat":    data["wf_raw_mat"],
        "wf_emp_cost":   data["wf_emp_cost"],
        "wf_other_opex": data["wf_other_opex"],
        "wf_deprec":     data["wf_deprec"],
        "wf_interest":   data["wf_interest"],
        "wf_tax":        data["wf_tax"],
    }

    existing_cos = [c for c in existing_cos if c["name"] != name]
    existing_cos.append(company_obj)
    existing_cos = add_ranks(existing_cos)

    existing_mets[name] = {k: data[k] for k in [
        "years", "sales", "ebitda", "ebitda_margin", "net_profit",
        "net_margin", "op_margin", "roce", "roe", "debt_equity",
        "inv_days", "debtor_days", "ccc", "asset_turn",
        "fcf", "cfo", "cfi", "cff", "capex", "prices",
        "pe_ratio", "pb_ratio", "ev_ebitda",
        "q_labels", "q_sales", "q_op", "q_net", "q_opm",
    ]}

    out("generating", "Writing JSON files…", pct=85)

    all_years = sorted({y for m in existing_mets.values() for y in m["years"]})
    meta = {
        "companies":     [c["name"] for c in existing_cos],
        "years":         all_years,
        "latest_year":   max(all_years) if all_years else None,
        "company_count": len(existing_cos),
        "updated_at":    datetime.now(timezone.utc).isoformat(),
    }

    json.dump(existing_cos,  open(companies_path, "w"), indent=2)
    json.dump(existing_mets, open(metrics_path,   "w"), indent=2)
    json.dump(meta,          open(meta_path,       "w"), indent=2)

    out("done", f"Saved {name} ({len(existing_cos)} companies total)", pct=100)


if __name__ == "__main__":
    main()
