export interface CompanySummary {
  company_id: string;
  company_name: string;
  periods: string[];
  uploaded_at?: string;
}

export interface KpiTile {
  key: string;
  label: string;
  value: number | null;
  display: string;
  unit: string;
  rank: number | null;
  of: number | null;
  trend: 'up' | 'down' | null;
  direction: 'higher' | 'lower';
  is_na: boolean;
  note?: string;
}

export interface RadarPoint {
  axis: string;
  you: number | null;
  bestInSet: number | null;
  industryMedian: number | null;
  you_raw: number | null;
}

export interface OperationalRow {
  kpi: string;
  you: string;
  bestInSet: string;
  industryMedian: string;
  vsBest: string;
  vsBestValue: number | null;
  direction: 'higher' | 'lower';
  is_na: boolean;
}

export interface CapitalBubble {
  company: string;
  company_id: string;
  capitalEmployed: number | null;
  ebitMargin: number | null;
  revenue: number | null;
  isYou: boolean;
}

export interface MarginRow {
  company: string;
  company_id: string;
  revenue: number | null;
  rawMaterialPct: number | null;
  employeePct: number | null;
  otherPct: number | null;
  ebitdaPct: number | null;
  isYou: boolean;
}

export interface MarginGapPanel {
  best: string;
  marginGap: number | null;
  breakdown: { driver: string; gap: number | null }[];
}

export interface BenchmarkResponse {
  your_company_id: string;
  fiscal_year: string | null;
  cockpit: { kpis: KpiTile[] };
  financial: { radar: RadarPoint[]; revenueTrend: Record<string, any>[]; seriesNames: string[] };
  operational: { rows: OperationalRow[] };
  capitalEfficiency: CapitalBubble[];
  marginWaterfall: MarginRow[];
  marginGapPanel: MarginGapPanel | null;
  allKpis: KpiTile[];
  companyNames: Record<string, string>;
}

export interface Insight {
  icon: string;
  title: string;
  body: string;
  severity: 'info' | 'positive' | 'warning' | 'negative';
}

export interface InsightsResponse {
  insights: Insight[];
  capital_banner: string | null;
  margin_banner: string | null;
  generated: boolean;
  error?: string;
}

export interface FeedCard {
  company_id: string;
  company_name: string;
  title: string;
  url: string;
  summary: string;
  published_date: string | null;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  category: string;
  impact_score: number;
  key_entities: string[];
  score: number;
}
