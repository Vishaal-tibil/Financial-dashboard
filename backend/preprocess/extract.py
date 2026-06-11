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


def parse_excel(path: str) -> dict:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb["Data Sheet"]
    rows = {i + 1: list(row) for i, row in enumerate(ws.iter_rows(values_only=True))}
    wb.close()

    def rv(r): return list(rows.get(r, [None] * 12))
    def ser(r, idx): return pd.Series(rv(r)[1:len(idx)+1], index=idx, dtype=float)

    company_name  = rv(1)[1] or Path(path).stem
    current_price = sf(rv(8)[1])
    market_cap    = sf(rv(9)[1])

    # Annual
    annual_raw   = [v for v in rv(16)[1:11] if v is not None]
    annual_dates = pd.to_datetime(annual_raw)
    years        = [d.year for d in annual_dates]

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

    safe_sales = sales.replace(0, np.nan)
    ebitda_margin = (ebitda / safe_sales * 100).round(2)
    net_margin    = (net_profit / safe_sales * 100).round(2)
    op_margin     = (op_profit / safe_sales * 100).round(2)

    # Quarterly
    q_raw    = rv(41)[1:11]
    q_dates  = pd.to_datetime([v for v in q_raw if v is not None])
    q_labels = [d.strftime("%b'%y") for d in q_dates]
    n_q      = len(q_labels)
    def qser(r): return pd.Series(rv(r)[1:n_q+1], index=q_labels, dtype=float)
    q_sales = qser(42)
    q_op    = qser(50)
    q_net   = qser(49)
    q_opm   = (q_op / q_sales.replace(0, np.nan) * 100).round(2)

    # Balance sheet
    bs_raw   = rv(56)[1:11]
    bs_years = [pd.to_datetime(v).year for v in bs_raw if v is not None]
    def bser(r): return pd.Series(rv(r)[1:len(bs_years)+1], index=bs_years, dtype=float)
    share_cap  = bser(57)
    reserves   = bser(58)
    borrowings = bser(59)
    total_liab = bser(61)
    receivable = bser(67)
    inventory  = bser(68)

    equity      = share_cap + reserves
    safe_equity = equity.replace(0, np.nan)
    debt_equity = (borrowings / safe_equity).round(2)
    cap_employ  = equity + borrowings
    roce        = (ebit / cap_employ.replace(0, np.nan) * 100).round(2)
    roe         = (net_profit / safe_equity * 100).round(2)

    safe_sales_bs = sales.reindex(bs_years).replace(0, np.nan)
    inv_days    = (inventory / safe_sales_bs * 365).round(1)
    debtor_days = (receivable / safe_sales_bs * 365).round(1)
    ccc         = (inv_days + debtor_days).round(1)
    asset_turn  = (sales.reindex(bs_years) / total_liab.replace(0, np.nan)).round(2)

    # Cash flow
    cf_raw   = rv(81)[1:11]
    cf_years = [pd.to_datetime(v).year for v in cf_raw if v is not None]
    def cfser(r): return pd.Series(rv(r)[1:len(cf_years)+1], index=cf_years, dtype=float)
    cfo   = cfser(82)
    cfi   = cfser(83)
    cff   = cfser(84)
    capex = cfi.abs()
    fcf   = cfo - capex

    # Prices
    prices = pd.Series(rv(90)[1:len(years)+1], index=years, dtype=float)

    sales_l        = to_list(sales)
    ebitda_margin_l = to_list(ebitda_margin)
    roce_l         = to_list(roce)
    asset_turn_l   = to_list(asset_turn)
    inv_days_l     = to_list(inv_days)
    ccc_l          = to_list(ccc)
    roe_l          = to_list(roe)
    net_margin_l   = to_list(net_margin)
    debt_equity_l  = to_list(debt_equity)
    fcf_l          = to_list(fcf)

    return {
        "company":       company_name,
        "current_price": current_price,
        "market_cap":    market_cap,
        "latest_year":   years[-1] if years else None,
        # KPI latest values
        "rev_growth":    yoy_growth(sales_l),
        "ebitda_margin": last(ebitda_margin_l),
        "roce":          last(roce_l),
        "asset_turn":    last(asset_turn_l),
        "inv_days":      last(inv_days_l),
        "ccc":           last(ccc_l),
        "roe":           last(roe_l),
        "net_margin":    last(net_margin_l),
        "debt_equity":   last(debt_equity_l),
        "fcf":           last(fcf_l),
        "rev_cagr_3":    cagr(sales_l, years, 3),
        "rev_cagr_5":    cagr(sales_l, years, 5),
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
        vals = [(nm, v) for nm, v in vals if v is not None]
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

    # Load existing accumulated data
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

    # Assign colour (avoid reusing colours already taken)
    used = {c.get("color") for c in existing_cos}
    color = next((c for c in COLORS if c not in used), COLORS[0])

    company_obj = {
        "name":          name,
        "color":         color,
        "current_price": data["current_price"],
        "market_cap":    data["market_cap"],
        "latest_year":   data["latest_year"],
        "rev_growth":    data["rev_growth"],
        "ebitda_margin": data["ebitda_margin"],
        "roce":          data["roce"],
        "asset_turn":    data["asset_turn"],
        "inv_days":      data["inv_days"],
        "ccc":           data["ccc"],
        "roe":           data["roe"],
        "net_margin":    data["net_margin"],
        "debt_equity":   data["debt_equity"],
        "fcf":           data["fcf"],
        "rev_cagr_3":    data["rev_cagr_3"],
        "rev_cagr_5":    data["rev_cagr_5"],
    }

    # Upsert company
    existing_cos = [c for c in existing_cos if c["name"] != name]
    existing_cos.append(company_obj)
    existing_cos = add_ranks(existing_cos)

    # Upsert metrics time series
    existing_mets[name] = {k: data[k] for k in [
        "years", "sales", "ebitda", "ebitda_margin", "net_profit",
        "net_margin", "op_margin", "roce", "roe", "debt_equity",
        "inv_days", "debtor_days", "ccc", "asset_turn",
        "fcf", "cfo", "cfi", "cff", "capex", "prices",
        "q_labels", "q_sales", "q_op", "q_net", "q_opm",
    ]}

    out("generating", "Writing JSON files…", pct=85)

    all_years = sorted({y for m in existing_mets.values() for y in m["years"]})
    meta = {
        "companies":     [c["name"] for c in existing_cos],
        "years":         all_years,
        "latest_year":   all_years[-1] if all_years else None,
        "company_count": len(existing_cos),
        "uploaded_at":   datetime.now(timezone.utc).isoformat(),
    }

    with open(companies_path, "w") as f: json.dump(existing_cos,  f, indent=2)
    with open(metrics_path,   "w") as f: json.dump(existing_mets, f, indent=2)
    with open(meta_path,      "w") as f: json.dump(meta,          f, indent=2)

    out("ready", f"'{name}' loaded successfully.", pct=100)


if __name__ == "__main__":
    main()
