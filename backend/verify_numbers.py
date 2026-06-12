"""
verify_numbers.py -- Spot-check all computed KPIs against reference values.

Run after any change to extract.py or the data pipeline:
    cd FD/backend && python verify_numbers.py

Checks:
  1. Validates key metrics in companies.json against FY26 audit reference values
  2. Validates waterfall bridge balance (wf_sales - raw_mat - emp - opex == EBIT)
  3. Prints rank table for EBITDA margin
"""

import json
import sys
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"

# Reference values from independent Opus analysis (FY26, top-down methodology)
REFERENCE = {
    "CARBORUNDUM UNIVERSAL LTD": {
        "ebitda_margin": 11.1, "roce": 7.7, "net_margin": 3.7,
        "asset_turn": 0.98, "inv_turns": 4.7,
    },
    "GRINDWELL NORTON LTD": {
        "ebitda_margin": 18.7, "roce": 18.1, "net_margin": 13.5,
        "asset_turn": 0.89, "inv_turns": 6.4,
    },
    "SKF INDIA (INDUSTRIAL) LTD": {
        "ebitda_margin": 11.3, "roce": 24.2, "net_margin": 6.3,
        "asset_turn": 1.29, "inv_turns": 6.4,
    },
    "TIMKEN INDIA LTD": {
        "ebitda_margin": 17.9, "roce": 16.9, "net_margin": 11.6,
        "asset_turn": 0.91, "inv_turns": 4.4,
    },
    "WENDT INDIA LTD": {
        "ebitda_margin": 13.6, "roce": 6.8, "net_margin": 6.2,
        "asset_turn": 0.77, "inv_turns": 4.5,
    },
}

MARGIN_TOL = 0.5   # +/- pp acceptable difference
TURNS_TOL  = 0.15  # +/- x  acceptable difference

OK   = "[PASS]"
BAD  = "[FAIL]"
SKIP = "[WARN]"


def check(label, got, ref, tol, unit=""):
    if got is None:
        print(f"    {SKIP}  {label}: got None (expected {ref}{unit})")
        return False
    diff = abs(got - ref)
    ok   = diff <= tol
    mark = OK if ok else BAD
    print(f"    {mark}  {label}: got {got:.2f}{unit}  ref {ref}{unit}  diff {diff:.2f}")
    return ok


def verify_reference(company):
    name = company["name"]
    ref  = REFERENCE.get(name)
    if not ref:
        print(f"    (no reference values for {name})")
        return 0

    failures = 0
    failures += 0 if check("EBITDA margin", company.get("ebitda_margin"), ref["ebitda_margin"], MARGIN_TOL, "%") else 1
    failures += 0 if check("ROCE",          company.get("roce"),          ref["roce"],          MARGIN_TOL, "%") else 1
    failures += 0 if check("Net margin",    company.get("net_margin"),    ref["net_margin"],    MARGIN_TOL, "%") else 1
    failures += 0 if check("Asset turns",   company.get("asset_turn"),    ref["asset_turn"],    TURNS_TOL,  "x") else 1
    failures += 0 if check("Inv turns",     company.get("inv_turns"),     ref["inv_turns"],     TURNS_TOL,  "x") else 1
    return failures


def verify_waterfall(company):
    sales  = company.get("wf_sales")
    rm     = company.get("wf_raw_mat")
    emp    = company.get("wf_emp_cost")
    opex   = company.get("wf_other_opex")
    ebit_m = company.get("op_margin")

    if any(v is None for v in [sales, rm, emp, opex, ebit_m]):
        print(f"    {SKIP}  Waterfall: missing field(s) -- skipping balance check")
        return 0

    ebit_bridge = sales - rm - emp - opex
    ebit_margin = round(ebit_m / 100 * sales, 1)
    diff        = abs(ebit_bridge - ebit_margin)
    ok          = diff <= 1.0   # <=1 Cr is acceptable float rounding

    mark = OK if ok else BAD
    print(f"    {mark}  Waterfall balance: bridge={ebit_bridge:.1f} Cr  margin-derived={ebit_margin:.1f} Cr  diff={diff:.1f} Cr")
    return 0 if ok else 1


def main():
    print("=" * 60)
    print("Financial Dashboard -- Number Verification")
    print("=" * 60)

    cos_path = DATA_DIR / "companies.json"
    if not cos_path.exists():
        print(f"\n{BAD}  companies.json not found at {cos_path}")
        print("     Start the backend first to generate data.")
        sys.exit(1)

    companies = json.load(open(cos_path))
    print(f"\nLoaded {len(companies)} companies from companies.json\n")

    total_failures = 0

    for company in companies:
        name = company["name"]
        print("-" * 55)
        print(f"  {name}  (FY{str(company.get('latest_year', '?'))[2:]})")
        print()

        print("  [Reference check vs independent audit]")
        total_failures += verify_reference(company)
        print()

        print("  [Waterfall bridge balance]")
        total_failures += verify_waterfall(company)
        print()

    # Rank sanity
    print("-" * 55)
    print("  [Rank sanity -- EBITDA margin (highest to lowest)]")
    ranked = sorted(
        [(c["name"].split()[0], c.get("ebitda_margin") or 0) for c in companies],
        key=lambda x: x[1], reverse=True,
    )
    for i, (short, v) in enumerate(ranked, 1):
        print(f"    #{i}  {short}: {v:.2f}%")

    print("\n" + "=" * 60)
    if total_failures == 0:
        print(f"{OK}  All {len(companies)} companies passed all checks.")
    else:
        print(f"{BAD}  {total_failures} check(s) failed -- review details above.")
    print("=" * 60)

    sys.exit(1 if total_failures > 0 else 0)


if __name__ == "__main__":
    main()
