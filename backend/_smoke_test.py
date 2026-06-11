"""Smoke test: synthetic Screener workbooks -> parse -> metrics -> benchmark.
Not a committed artifact (excluded from git); run manually to validate logic."""
import datetime as dt
import tempfile
import os
from pathlib import Path

from openpyxl import Workbook

TMP = tempfile.gettempdir()


def make_company(path, name, sales_base, rm_ratio, emp_ratio, market_cap):
    wb = Workbook()
    ws = wb.active
    ws.title = "Data Sheet"
    rows = [["Data Sheet"], [], ["META"],
            ["COMPANY NAME", name], ["Number of shares", 100000000],
            ["Face Value", 10], ["Current Price", 850],
            ["Market Capitalization", market_cap], []]
    years = [dt.datetime(y, 3, 31) for y in range(2021, 2026)]
    grow = lambda base, g: [round(base * (1 + g) ** i, 1) for i in range(5)]
    sales = grow(sales_base, 0.10)
    rows += [["PROFIT & LOSS"], ["Report Date"] + years,
             ["Sales"] + sales,
             ["Raw Material Cost"] + [round(s * rm_ratio, 1) for s in sales],
             ["Change in Inventory"] + [0] * 5,
             ["Power and Fuel"] + [round(s * 0.04, 1) for s in sales],
             ["Other Mfr. Exp"] + [round(s * 0.03, 1) for s in sales],
             ["Employee Cost"] + [round(s * emp_ratio, 1) for s in sales],
             ["Selling and admin"] + [round(s * 0.03, 1) for s in sales],
             ["Other Expenses"] + [round(s * 0.02, 1) for s in sales],
             ["Other Income"] + [round(s * 0.01, 1) for s in sales],
             ["Depreciation"] + [round(s * 0.04, 1) for s in sales],
             ["Interest"] + [round(s * 0.01, 1) for s in sales]]
    pbt = [round(s * 0.15, 1) for s in sales]
    rows += [["Profit before tax"] + pbt,
             ["Tax"] + [round(p * 0.25, 1) for p in pbt],
             ["Net profit"] + [round(p * 0.75, 1) for p in pbt],
             ["Dividend Amount"] + [round(p * 0.2, 1) for p in pbt], []]
    qdates = [dt.datetime(2024, m, 1) for m in (3, 6, 9, 12)] + [dt.datetime(2025, 3, 1)]
    q = round(sales[-1] / 4, 1)
    rows += [["Quarters"], ["Report Date"] + qdates,
             ["Sales"] + [q] * 5, ["Expenses"] + [round(q * 0.82, 1)] * 5,
             ["Other Income"] + [round(q * 0.01, 1)] * 5,
             ["Depreciation"] + [round(q * 0.04, 1)] * 5,
             ["Interest"] + [round(q * 0.01, 1)] * 5,
             ["Profit before tax"] + [round(q * 0.15, 1)] * 5,
             ["Tax"] + [round(q * 0.04, 1)] * 5,
             ["Net profit"] + [round(q * 0.11, 1)] * 5,
             ["Operating Profit"] + [round(q * 0.18, 1)] * 5, []]
    rows += [["BALANCE SHEET"], ["Report Date"] + years,
             ["Equity Share Capital"] + [100] * 5,
             ["Reserves"] + grow(sales_base * 0.8, 0.10),
             ["Borrowings"] + [round(s * 0.2, 1) for s in sales],
             ["Other Liabilities"] + [round(s * 0.15, 1) for s in sales],
             ["Total"] + [round(s * 1.5, 1) for s in sales],
             ["Net Block"] + [round(s * 0.6, 1) for s in sales],
             ["Capital Work in Progress"] + [round(s * 0.05, 1) for s in sales],
             ["Investments"] + [round(s * 0.1, 1) for s in sales],
             ["Other Assets"] + [round(s * 0.5, 1) for s in sales],
             ["Total"] + [round(s * 1.25, 1) for s in sales],
             ["Receivables"] + [round(s * 0.15, 1) for s in sales],
             ["Inventory"] + [round(s * 0.18, 1) for s in sales],
             ["Cash & Bank"] + [round(s * 0.05, 1) for s in sales],
             ["No. of Equity Shares"] + [100000000] * 5,
             ["Face value"] + [10] * 5, []]
    rows += [["CASH FLOW:"], ["Report Date"] + years,
             ["Cash from Operating Activity"] + [round(s * 0.12, 1) for s in sales],
             ["Cash from Investing Activity"] + [round(-s * 0.06, 1) for s in sales],
             ["Cash from Financing Activity"] + [round(-s * 0.04, 1) for s in sales],
             ["Net Cash Flow"] + [round(s * 0.02, 1) for s in sales]]
    for r in rows:
        ws.append(r)
    wb.save(path)


from app.services import store
from app.services.benchmark_service import build_benchmark
from app.services.excel_parser import parse_screener_file, NotAScreenerFile

files = {
    "Carborundum.xlsx": ("Carborundum Universal", 3000, 0.45, 0.10, 28000),
    "BharatForge.xlsx": ("Bharat Forge", 5000, 0.40, 0.12, 52000),
    "Grindwell.xlsx": ("Grindwell Norton", 2200, 0.48, 0.11, 19000),
}
for fn, args in files.items():
    p = os.path.join(TMP, fn)
    make_company(p, *args)
    s = store.process_upload(fn, Path(p).read_bytes())
    print("Uploaded:", s["company_id"], "|", s["company_name"], "| periods:", s["periods"])

# reject test
bad = Workbook()
bad.active.title = "Sheet1"
bad.active.append(["hello"])
badp = os.path.join(TMP, "bad.xlsx")
bad.save(badp)
try:
    parse_screener_file(badp)
    print("REJECT TEST FAILED")
except NotAScreenerFile as e:
    print("Reject non-Screener: OK")

b = build_benchmark("carborundum", ["bharatforge", "grindwell"], None)
print("\nFY:", b["fiscal_year"], "| Series:", b["financial"]["seriesNames"])
print("\nCockpit KPIs:")
for k in b["cockpit"]["kpis"]:
    print(f"  {k['label']:28} {k['display']:>10}  rank #{k['rank']} of {k['of']}")
print("\nMargin gap panel:", b["marginGapPanel"])
print("\nCapital efficiency:")
for c in b["capitalEfficiency"]:
    print(f"  {c['company']:22} CE={c['capitalEmployed']}  EBITm={round(c['ebitMargin'],2)}  rev={c['revenue']}")
print("\nRadar axes:", [r["axis"] for r in b["financial"]["radar"]])
print("Operational rows:", [(r["kpi"], r["you"], r["vsBest"]) for r in b["operational"]["rows"]])
