"""Metrics engine — computes the KPI catalog (PLANNING §4) from a parsed
Screener workbook.

Conventions:
- All flow values are in ₹ Cr. Share counts are absolute.
- Every division is guarded; missing inputs yield ``None`` (UI renders "—").
- TTM = sum of the last 4 quarterly values for flow metrics; balance-sheet
  stock items use the latest annual period directly.
"""
from __future__ import annotations

from typing import Any, Optional


# ---------- label resolution ----------
# Map a canonical key to a list of acceptable label substrings (lowercased).
PNL_ALIASES: dict[str, list[str]] = {
    "sales": ["sales", "revenue"],
    "raw_material": ["raw material"],
    "change_in_inventory": ["change in inventory"],
    "power_fuel": ["power and fuel", "power & fuel"],
    "other_mfr": ["other mfr", "other manufacturing"],
    "employee": ["employee cost", "employee"],
    "selling_admin": ["selling and admin", "selling & admin"],
    "other_expenses": ["other expenses"],
    "other_income": ["other income"],
    "depreciation": ["depreciation"],
    "interest": ["interest"],
    "pbt": ["profit before tax"],
    "tax": ["tax"],
    "net_profit": ["net profit"],
    "dividend": ["dividend amount", "dividend"],
}

QUARTER_ALIASES: dict[str, list[str]] = {
    "sales": ["sales", "revenue"],
    "expenses": ["expenses"],
    "other_income": ["other income"],
    "depreciation": ["depreciation"],
    "interest": ["interest"],
    "pbt": ["profit before tax"],
    "tax": ["tax"],
    "net_profit": ["net profit"],
    "operating_profit": ["operating profit"],
}

BS_ALIASES: dict[str, list[str]] = {
    "equity_capital": ["equity share capital"],
    "reserves": ["reserves"],
    "borrowings": ["borrowings"],
    "other_liabilities": ["other liabilities"],
    "net_block": ["net block"],
    "cwip": ["capital work in progress", "work in progress"],
    "investments": ["investments"],
    "other_assets": ["other assets"],
    "receivables": ["receivables", "debtors"],
    "inventory": ["inventory"],
    "cash": ["cash & bank", "cash and bank", "cash"],
    "shares": ["no. of equity shares", "number of equity shares"],
    "face_value": ["face value"],
}

CF_ALIASES: dict[str, list[str]] = {
    "cfo": ["cash from operating"],
    "cfi": ["cash from investing"],
    "cff": ["cash from financing"],
    "net_cash": ["net cash flow"],
}


def _safe_div(a: Optional[float], b: Optional[float]) -> Optional[float]:
    if a is None or b is None or b == 0:
        return None
    return a / b


def _match_item(items: dict[str, list[Optional[float]]], aliases: list[str]) -> Optional[list[Optional[float]]]:
    # exact-ish: prefer the shortest label that contains an alias
    candidates: list[tuple[int, str]] = []
    for label in items:
        ll = label.lower()
        for alias in aliases:
            if alias in ll:
                candidates.append((len(label), label))
                break
    if not candidates:
        return None
    candidates.sort()
    return items[candidates[0][1]]


class CompanyData:
    """Wraps a parsed workbook dict and exposes period-aware metric lookups."""

    def __init__(self, parsed: dict[str, Any], company_id: str):
        self.company_id = company_id
        self.company_name = parsed.get("company_name") or company_id
        self.meta = parsed.get("meta", {})
        sections = parsed.get("sections", {})
        self._pnl = sections.get("pnl", {"periods": [], "items": {}})
        self._q = sections.get("quarters", {"periods": [], "items": {}})
        self._bs = sections.get("balance_sheet", {"periods": [], "items": {}})
        self._cf = sections.get("cash_flow", {"periods": [], "items": {}})
        self._price = sections.get("price", {"periods": [], "items": {}})
        self.partial_flags: list[str] = []

    # ---- period helpers ----
    @property
    def annual_periods(self) -> list[str]:
        return self._pnl.get("periods", [])

    def _idx(self, periods: list[str], fy: Optional[str]) -> Optional[int]:
        if not periods:
            return None
        if fy is None:
            return len(periods) - 1
        if fy in periods:
            return periods.index(fy)
        return len(periods) - 1  # fallback to latest

    def _val(self, section: dict, aliases: list[str], fy: Optional[str], default0: bool = False) -> Optional[float]:
        items = section.get("items", {})
        periods = section.get("periods", [])
        series = _match_item(items, aliases)
        if series is None:
            return 0.0 if default0 else None
        i = self._idx(periods, fy)
        if i is None or i >= len(series):
            return 0.0 if default0 else None
        v = series[i]
        if v is None and default0:
            return 0.0
        return v

    # ---- P&L getters ----
    def pnl(self, key: str, fy: Optional[str], default0: bool = False) -> Optional[float]:
        return self._val(self._pnl, PNL_ALIASES[key], fy, default0)

    def bs(self, key: str, fy: Optional[str], default0: bool = False) -> Optional[float]:
        return self._val(self._bs, BS_ALIASES[key], fy, default0)

    def cf(self, key: str, fy: Optional[str], default0: bool = False) -> Optional[float]:
        return self._val(self._cf, CF_ALIASES[key], fy, default0)

    # ---- TTM ----
    def _ttm(self, key: str) -> tuple[Optional[float], bool]:
        items = self._q.get("items", {})
        series = _match_item(items, QUARTER_ALIASES[key])
        if not series:
            return None, True
        vals = [v for v in series if v is not None]
        if not vals:
            return None, True
        last4 = vals[-4:]
        partial = len(last4) < 4
        return sum(last4), partial

    def ttm(self, key: str) -> Optional[float]:
        v, _ = self._ttm(key)
        return v

    # ---- derived building blocks ----
    def operating_profit(self, fy: Optional[str]) -> Optional[float]:
        sales = self.pnl("sales", fy)
        if sales is None:
            return None
        op_ex = sum(
            (self.pnl(k, fy, default0=True) or 0.0)
            for k in (
                "raw_material",
                "change_in_inventory",
                "power_fuel",
                "other_mfr",
                "employee",
                "selling_admin",
                "other_expenses",
            )
        )
        return sales - op_ex

    def cogs(self, fy: Optional[str]) -> Optional[float]:
        rm = self.pnl("raw_material", fy, default0=True) or 0.0
        ci = self.pnl("change_in_inventory", fy, default0=True) or 0.0
        pf = self.pnl("power_fuel", fy, default0=True) or 0.0
        return rm + ci + pf

    def ebit(self, fy: Optional[str]) -> Optional[float]:
        op = self.operating_profit(fy)
        oi = self.pnl("other_income", fy, default0=True) or 0.0
        dep = self.pnl("depreciation", fy, default0=True) or 0.0
        if op is None:
            return None
        return op + oi - dep

    def equity(self, fy: Optional[str]) -> Optional[float]:
        ec = self.bs("equity_capital", fy)
        rs = self.bs("reserves", fy)
        if ec is None and rs is None:
            return None
        return (ec or 0.0) + (rs or 0.0)

    def capital_employed(self, fy: Optional[str]) -> Optional[float]:
        eq = self.equity(fy)
        bw = self.bs("borrowings", fy, default0=True) or 0.0
        if eq is None:
            return None
        return eq + bw

    def total_assets(self, fy: Optional[str]) -> Optional[float]:
        parts = [self.bs(k, fy, default0=True) or 0.0 for k in ("net_block", "cwip", "investments", "other_assets")]
        total = sum(parts)
        return total if total else None

    def ttm_operating_profit(self) -> Optional[float]:
        op = self.ttm("operating_profit")
        if op is not None:
            return op
        # fall back: TTM sales - TTM expenses
        s = self.ttm("sales")
        e = self.ttm("expenses")
        if s is None or e is None:
            return None
        return s - e

    def ttm_ebit(self) -> Optional[float]:
        op = self.ttm_operating_profit()
        oi = self.ttm("other_income") or 0.0
        dep = self.ttm("depreciation") or 0.0
        if op is None:
            return None
        return op + oi - dep


def compute_company_metrics(data: CompanyData, fy: Optional[str]) -> dict[str, Any]:
    """Compute the full metric set for one company at the given fiscal year."""
    periods = data.annual_periods
    fy = fy if (fy and fy in periods) else (periods[-1] if periods else None)
    prev_fy = None
    if fy and fy in periods:
        i = periods.index(fy)
        prev_fy = periods[i - 1] if i > 0 else None

    sales = data.pnl("sales", fy)
    sales_prev = data.pnl("sales", prev_fy) if prev_fy else None
    op = data.operating_profit(fy)
    ebit = data.ebit(fy)
    pbt = data.pnl("pbt", fy)
    tax = data.pnl("tax", fy)
    net = data.pnl("net_profit", fy)
    interest = data.pnl("interest", fy)
    dividend = data.pnl("dividend", fy)
    shares = data.bs("shares", fy)
    equity = data.equity(fy)
    cap_emp = data.capital_employed(fy)
    total_assets = data.total_assets(fy)
    inventory = data.bs("inventory", fy)
    receivables = data.bs("receivables", fy)
    net_block = data.bs("net_block", fy)
    borrowings = data.bs("borrowings", fy, default0=True)
    other_liab = data.bs("other_liabilities", fy)
    cogs = data.cogs(fy)
    cfo = data.cf("cfo", fy)
    cfi = data.cf("cfi", fy)
    net_cash = data.cf("net_cash", fy)
    current_price = data.meta.get("Current Price")
    market_cap = data.meta.get("Market Capitalization")
    if isinstance(current_price, str):
        current_price = None
    if isinstance(market_cap, str):
        market_cap = None

    # TTM
    ttm_sales = data.ttm("sales")
    ttm_op = data.ttm_operating_profit()
    ttm_ebit = data.ttm_ebit()
    ttm_net = data.ttm("net_profit")

    eps = _safe_div(net, shares) if shares else None  # ₹ Cr / count → ₹Cr per share
    # EPS in ₹ per share: net profit is ₹ Cr (×1e7), shares absolute
    eps_rupees = _safe_div((net * 1e7) if net is not None else None, shares) if shares else None
    ttm_eps_rupees = _safe_div((ttm_net * 1e7) if ttm_net is not None else None, shares) if shares else None
    pe = _safe_div(current_price, ttm_eps_rupees)

    # CAGR helper
    def cagr(years: int) -> Optional[float]:
        if not periods or fy not in periods:
            return None
        i = periods.index(fy)
        j = i - years
        if j < 0:
            return None
        s0 = data.pnl("sales", periods[j])
        s1 = sales
        if s0 is None or s1 is None or s0 <= 0:
            return None
        return (s1 / s0) ** (1 / years) - 1

    debtor_days = _safe_div((receivables * 365) if receivables is not None else None, sales)
    inventory_days = _safe_div((inventory * 365) if inventory is not None else None, cogs)
    payable_days = _safe_div((other_liab * 365) if other_liab is not None else None, cogs)
    ccc = None
    if debtor_days is not None and inventory_days is not None and payable_days is not None:
        ccc = debtor_days + inventory_days - payable_days

    metrics: dict[str, Any] = {
        # growth & profitability
        "revenue_growth_yoy": _safe_div(sales, sales_prev) - 1 if (sales and sales_prev) else None,
        "revenue_cagr_3y": cagr(3),
        "revenue_cagr_5y": cagr(5),
        "revenue_cagr_10y": cagr(10),
        "operating_profit": op,
        "opm_pct": _safe_div(op, sales),
        "ebitda_margin_ttm": _safe_div(ttm_op, ttm_sales),
        "ebit": ebit,
        "ebit_margin_pct": _safe_div(ebit, sales),
        "pbt_margin_pct": _safe_div(pbt, sales),
        "net_margin_pct": _safe_div(net, sales),
        "effective_tax_rate": _safe_div(tax, pbt),
        "eps": eps_rupees,
        "dividend_payout_pct": _safe_div(dividend, net),
        # returns & efficiency
        "equity": equity,
        "capital_employed": cap_emp,
        "roe_pct": _safe_div(net, equity),
        "roce_pct": _safe_div(ebit, cap_emp),
        "roce_ttm_pct": _safe_div(ttm_ebit, cap_emp),
        "asset_turnover": _safe_div(sales, total_assets),
        "asset_turnover_ttm": _safe_div(ttm_sales, total_assets),
        "inventory_turnover": _safe_div(cogs, inventory) or _safe_div(sales, inventory),
        "fixed_asset_turnover": _safe_div(sales, net_block),
        # working capital & cash
        "debtor_days": debtor_days,
        "inventory_days": inventory_days,
        "payable_days_approx": payable_days,
        "cash_conversion_cycle": ccc,
        "cash_conversion_ratio": _safe_div(cfo, op),
        "free_cash_flow": (cfo + cfi) if (cfo is not None and cfi is not None) else None,
        "net_cash_flow": net_cash,
        # leverage & valuation
        "debt_to_equity": _safe_div(borrowings, equity),
        "debt_ratio": _safe_div(borrowings, total_assets),
        "interest_coverage": _safe_div(ebit, interest),
        "pe": pe,
        "market_cap": market_cap,
        "price_to_book": _safe_div(market_cap, equity),
        # raw building blocks for charts / waterfall
        "sales": sales,
        "ttm_sales": ttm_sales,
        "raw_material_pct": _safe_div(cogs, sales),
        "employee_pct": _safe_div(data.pnl("employee", fy, default0=True), sales),
        "other_expenses_pct": _safe_div(
            ((data.pnl("other_mfr", fy, default0=True) or 0.0)
             + (data.pnl("selling_admin", fy, default0=True) or 0.0)
             + (data.pnl("other_expenses", fy, default0=True) or 0.0)),
            sales,
        ),
        "cash_flow_to_sales": _safe_div(cfo, sales),
    }
    return {
        "company_id": data.company_id,
        "company_name": data.company_name,
        "fiscal_year": fy,
        "periods": periods,
        "metrics": metrics,
        # revenue series for the trend chart (label -> value)
        "revenue_series": {p: data.pnl("sales", p) for p in periods},
    }
