import { useState } from 'react';
import { Icon } from '../ui/Icon';
import { api } from '../../api/client';
import { useCompanies, useHealth } from '../../api/hooks';
import { TabKey, useSelections } from '../../store/selections';

const TAB_META: Record<TabKey, { title: string; subtitle: string }> = {
  home: { title: 'Executive Cockpit', subtitle: '360° performance benchmark vs selected competitors' },
  cockpit: { title: 'Executive Cockpit', subtitle: 'Headline KPIs ranked across your comparison set' },
  financial: { title: 'Financial Benchmarking', subtitle: 'Health radar & revenue trend vs competitors' },
  operational: { title: 'Operational Benchmarking', subtitle: 'Efficiency & working-capital comparison' },
  capital: { title: 'Capital Efficiency Matrix', subtitle: 'Profitability vs capital employed efficiency' },
  margin: { title: 'Margin Waterfall', subtitle: 'EBITDA margin broken down by cost drivers' },
  insights: { title: 'AI Insights', subtitle: 'LLM-generated competitive intelligence' },
  feed: { title: 'Competitor Intelligence', subtitle: 'Live public updates on your competitors' },
  chat: { title: 'Ask AI Assistant', subtitle: 'Reason over the financial data and the web' },
  upload: { title: 'Upload Excel', subtitle: 'Add Screener.in exports to the workspace' },
};

export function Header() {
  const { activeTab, fiscalYear, setFiscalYear, yourCompany, competitors } = useSelections();
  const { data: companies } = useCompanies();
  const { data: health } = useHealth();
  const [downloading, setDownloading] = useState(false);
  const meta = TAB_META[activeTab];

  // FY options come from the union of selected companies' periods (§3.7)
  const selectedIds = [yourCompany, ...competitors].filter(Boolean) as string[];
  const periods = Array.from(
    new Set((companies ?? []).filter((c) => selectedIds.includes(c.company_id)).flatMap((c) => c.periods)),
  ).sort();

  async function downloadReport() {
    if (!yourCompany) return;
    setDownloading(true);
    try {
      const res = await fetch(api.reportUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ your_company_id: yourCompany, competitor_ids: competitors, fiscal_year: fiscalYear }),
      });
      const blob = await res.blob();
      const isPdf = blob.type === 'application/pdf';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `competitor-report.${isPdf ? 'pdf' : 'html'}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-canvas/90 backdrop-blur border-b border-gray-200">
      <div className="flex items-center justify-between px-6 h-16">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{meta.title}</h1>
          <p className="text-xs text-gray-500">{meta.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={fiscalYear ?? ''}
              onChange={(e) => setFiscalYear(e.target.value || null)}
              className="appearance-none bg-white border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="">{periods.length ? `Latest (${periods[periods.length - 1]})` : 'Fiscal Year'}</option>
              {periods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <Icon name="calendar" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Icon name="chevronDown" size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <button
            onClick={downloadReport}
            disabled={!yourCompany || downloading}
            className="flex items-center gap-2 bg-brand text-white text-sm font-medium px-3.5 py-2 rounded-lg shadow-sm hover:bg-brand/90 disabled:opacity-40"
          >
            <Icon name="download" size={16} />
            {downloading ? 'Preparing…' : 'Download Report'}
          </button>

          <button className="relative w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700">
            <Icon name="bell" size={18} />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-bad text-white text-[10px] flex items-center justify-center">
              {competitors.length || 0}
            </span>
          </button>

          <div className="flex items-center gap-2 pl-2">
            <div className="w-9 h-9 rounded-lg bg-navy text-white flex items-center justify-center text-sm font-semibold">
              SK
            </div>
            <div className="leading-tight hidden lg:block">
              <div className="text-sm font-semibold text-gray-800">S. Kumar</div>
              <div className="text-[11px] text-gray-500">Strategy Head</div>
            </div>
          </div>
        </div>
      </div>
      {health && (!health.groq_configured || !health.tavily_configured) && (
        <div className="px-6 py-1.5 bg-amber-50 border-t border-amber-100 text-[11px] text-amber-700">
          {!health.groq_configured && 'GROQ_API_KEY not set — AI insights/chat use heuristic fallback. '}
          {!health.tavily_configured && 'TAVILY_API_KEY not set — competitor news feed disabled.'}
        </div>
      )}
    </header>
  );
}
