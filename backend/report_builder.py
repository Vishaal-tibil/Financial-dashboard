"""
report_builder.py — assembles the LLM prompt for Insight Studio report generation
"""

REPORT_TEMPLATES = {
    "executive_summary": """
Produce an EXECUTIVE SUMMARY report. Return EXACTLY this JSON (no markdown):
{{
  "title": "Executive Summary — {companies} ({period})",
  "sections": [
    {{
      "heading": "Performance Overview",
      "bullets": ["<specific finding with number>", "<finding>", "<finding>"]
    }},
    {{
      "heading": "Key Strengths",
      "bullets": ["<strength with company name and metric>", "<strength>"]
    }},
    {{
      "heading": "Risk Signals",
      "bullets": ["<risk with company name and metric>", "<risk>"]
    }},
    {{
      "heading": "Strategic Recommendations",
      "bullets": ["<recommendation>", "<recommendation>"]
    }}
  ],
  "verdict": "<one-sentence overall assessment of sector health>",
  "top_performer": "<company name>",
  "watch_out": "<company name>"
}}
Rules: Use ₹ and %. Reference specific years. Be C-suite terse.
""",

    "peer_benchmarking": """
Produce a PEER BENCHMARKING report comparing all companies. Return EXACTLY this JSON (no markdown):
{{
  "title": "Peer Benchmarking — {companies} ({period})",
  "sections": [
    {{
      "heading": "Profitability Rankings",
      "bullets": ["<rank 1 company: metric value>", "<rank 2>", "<rank 3>", "<rank 4>", "<rank 5>"]
    }},
    {{
      "heading": "Operational Efficiency",
      "bullets": ["<finding on asset turn / CCC / inventory>", "<finding>", "<finding>"]
    }},
    {{
      "heading": "Capital Structure",
      "bullets": ["<D/E comparison>", "<ROCE comparison>", "<FCF comparison>"]
    }},
    {{
      "heading": "Valuation",
      "bullets": ["<P/E comparison>", "<EV/EBITDA comparison>"]
    }}
  ],
  "verdict": "<one-sentence peer ranking verdict>",
  "top_performer": "<company name>",
  "watch_out": "<company name>"
}}
""",

    "trend_analysis": """
Produce a TREND ANALYSIS report focusing on multi-year trajectories. Return EXACTLY this JSON (no markdown):
{{
  "title": "Trend Analysis — {companies} ({period})",
  "sections": [
    {{
      "heading": "Revenue Trajectory",
      "bullets": ["<CAGR for each company>", "<growth leader>", "<growth laggard>"]
    }},
    {{
      "heading": "Margin Trends",
      "bullets": ["<EBITDA margin direction per company>", "<net margin trend>"]
    }},
    {{
      "heading": "Balance Sheet Evolution",
      "bullets": ["<debt trend>", "<equity build-up>", "<asset base change>"]
    }},
    {{
      "heading": "Working Capital Trends",
      "bullets": ["<CCC trend>", "<inventory days trend>", "<debtor days trend>"]
    }}
  ],
  "verdict": "<one-sentence sector trend verdict>",
  "top_performer": "<company showing best trend improvement>",
  "watch_out": "<company showing deteriorating trend>"
}}
""",

    "capital_efficiency": """
Produce a CAPITAL EFFICIENCY DEEP DIVE report. Return EXACTLY this JSON (no markdown):
{{
  "title": "Capital Efficiency Deep Dive — {companies} ({period})",
  "sections": [
    {{
      "heading": "Return on Capital",
      "bullets": ["<ROCE per company>", "<ROE per company>", "<ROCE vs industry avg>"]
    }},
    {{
      "heading": "Free Cash Flow Quality",
      "bullets": ["<FCF per company>", "<FCF conversion rate>", "<FCF trend>"]
    }},
    {{
      "heading": "CapEx Deployment",
      "bullets": ["<CapEx intensity>", "<growth vs maintenance capex signals>"]
    }},
    {{
      "heading": "Asset Utilisation",
      "bullets": ["<asset turnover comparison>", "<inventory efficiency>"]
    }}
  ],
  "verdict": "<one-sentence capital efficiency verdict>",
  "top_performer": "<most capital-efficient company>",
  "watch_out": "<least capital-efficient company>"
}}
""",
}


def build_report_prompt(report_type: str, companies: list, period: str) -> str:
    template = REPORT_TEMPLATES.get(report_type, REPORT_TEMPLATES["executive_summary"])
    company_str = ", ".join(companies) if companies else "All Companies"
    return template.format(companies=company_str, period=period)
