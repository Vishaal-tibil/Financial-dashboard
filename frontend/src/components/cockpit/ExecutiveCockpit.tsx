import { useState } from 'react';
import clsx from 'clsx';
import { Icon } from '../ui/Icon';
import { Skeleton, ErrorState } from '../ui/states';
import { useBenchmark } from '../../api/hooks';
import type { KpiTile } from '../../api/types';

const TILE_ICONS: Record<string, { icon: string; tint: string }> = {
  revenue_growth_yoy: { icon: 'trendingUp', tint: 'bg-brand/10 text-brand' },
  ebitda_margin_ttm: { icon: 'bars', tint: 'bg-ai/10 text-ai' },
  roce_ttm_pct: { icon: 'target', tint: 'bg-good/10 text-good' },
  asset_turnover_ttm: { icon: 'gauge', tint: 'bg-amber-100 text-amber-600' },
  inventory_turnover: { icon: 'layers', tint: 'bg-cyan-100 text-cyan-600' },
  cash_conversion_cycle: { icon: 'cash', tint: 'bg-pink-100 text-pink-600' },
};

function Tile({ t }: { t: KpiTile }) {
  const meta = TILE_ICONS[t.key] ?? { icon: 'gauge', tint: 'bg-gray-100 text-gray-500' };
  const goodTrend = t.trend === 'up';
  return (
    <div className="bg-white rounded-2xl shadow-card p-4 flex flex-col gap-2">
      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', meta.tint)}>
        <Icon name={meta.icon} size={18} />
      </div>
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{t.label}</div>
      <div className={clsx('text-2xl font-extrabold', t.is_na ? 'text-gray-300' : 'text-gray-900')}>{t.display}</div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-gray-400">{t.rank ? `Rank #${t.rank} of ${t.of}` : t.is_na ? 'N/A' : '—'}</span>
        {t.rank && (
          <span className={clsx('flex items-center gap-0.5 font-medium', goodTrend ? 'text-good' : 'text-bad')}>
            <Icon name={goodTrend ? 'arrowUp' : 'arrowDown'} size={12} />
          </span>
        )}
      </div>
    </div>
  );
}

function AllKpiGrid({ kpis }: { kpis: KpiTile[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
      {kpis.map((t) => (
        <div key={t.key} className="border border-gray-100 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{t.label}</div>
          <div className={clsx('text-lg font-bold', t.is_na ? 'text-gray-300' : 'text-gray-900')}>{t.display}</div>
          <div className="text-[11px] text-gray-400">{t.rank ? `#${t.rank} of ${t.of}` : t.note ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}

export function ExecutiveCockpit({ expanded = false }: { expanded?: boolean }) {
  const { data, isLoading, isError, error, refetch } = useBenchmark();
  const [showAll, setShowAll] = useState(expanded);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }
  if (isError) return <div className="card"><ErrorState message={(error as Error).message} onRetry={refetch} /></div>;
  if (!data) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="section-title text-brand">
          <Icon name="gauge" size={15} /> Executive Cockpit <span className="text-gray-400 normal-case font-normal">(TTM)</span>
        </div>
        {!expanded && (
          <button onClick={() => setShowAll((v) => !v)} className="link-more flex items-center gap-1">
            {showAll ? 'Hide KPIs' : 'View all KPIs'} <Icon name="chevronDown" size={13} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {data.cockpit.kpis.map((t) => (
          <Tile key={t.key} t={t} />
        ))}
      </div>
      {(showAll || expanded) && (
        <div className="card mt-4">
          <div className="section-title text-gray-500 mb-1">
            <Icon name="table" size={14} /> All KPIs
          </div>
          <AllKpiGrid kpis={data.allKpis} />
        </div>
      )}
    </div>
  );
}
