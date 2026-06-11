import clsx from 'clsx';
import { Icon } from '../ui/Icon';
import { Skeleton, ErrorState } from '../ui/states';
import { useBenchmark, useInsights } from '../../api/hooks';
import { fmtNum, fmtSigned } from '../../lib/format';

function Bar({ pct, color }: { pct: number | null; color: string }) {
  if (pct === null) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[40px]">
        <div className={color} style={{ width: `${Math.min(Math.abs(pct), 100)}%`, height: '100%' }} />
      </div>
      <span className="text-xs text-gray-600 w-12 text-right">{fmtNum(pct)}%</span>
    </div>
  );
}

export function MarginWaterfall({ expanded = false }: { expanded?: boolean }) {
  const { data, isLoading, isError, error, refetch } = useBenchmark();
  const { data: insights } = useInsights();

  if (isLoading) return <div className="card"><Skeleton className="h-72" /></div>;
  if (isError) return <div className="card"><ErrorState message={(error as Error).message} onRetry={refetch} /></div>;
  if (!data) return null;

  const gap = data.marginGapPanel;

  return (
    <div className="card h-full flex flex-col">
      <div className="section-title text-brand">
        <Icon name="layers" size={15} /> Margin Waterfall Benchmark <span className="text-gray-400 normal-case font-normal">(TTM)</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">EBITDA margin broken down by cost drivers</p>

      <div className={clsx('grid gap-4 flex-1', gap ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1')}>
        <div className={clsx('overflow-x-auto', gap && 'lg:col-span-2')}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="text-left font-semibold py-2">Company</th>
                <th className="text-right font-semibold py-2">Revenue ₹Cr</th>
                <th className="text-left font-semibold py-2 px-2">Raw Material %</th>
                <th className="text-left font-semibold py-2 px-2">Employee %</th>
                <th className="text-left font-semibold py-2 px-2">Other Exp %</th>
                <th className="text-left font-semibold py-2 px-2">EBITDA %</th>
              </tr>
            </thead>
            <tbody>
              {data.marginWaterfall.map((m) => (
                <tr key={m.company_id} className={clsx('border-b border-gray-50 last:border-0', m.isYou && 'bg-brand/5')}>
                  <td className="py-2.5 font-medium text-gray-800">
                    {m.company}
                    {m.isYou && <span className="ml-1 pill bg-brand/10 text-brand text-[10px]">You</span>}
                  </td>
                  <td className="py-2.5 text-right text-gray-700">{m.revenue != null ? fmtNum(m.revenue, 0) : '—'}</td>
                  <td className="py-2.5 px-2"><Bar pct={m.rawMaterialPct} color="bg-bad/70" /></td>
                  <td className="py-2.5 px-2"><Bar pct={m.employeePct} color="bg-bad/50" /></td>
                  <td className="py-2.5 px-2"><Bar pct={m.otherPct} color="bg-bad/40" /></td>
                  <td className="py-2.5 px-2"><Bar pct={m.ebitdaPct} color="bg-good/70" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {gap && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
              vs Best-in-Class ({gap.best})
            </div>
            <div className="text-xs text-gray-500 mt-1">Margin Gap</div>
            <div className={clsx('text-3xl font-extrabold', (gap.marginGap ?? 0) >= 0 ? 'text-good' : 'text-bad')}>
              {fmtSigned(gap.marginGap, 'pp')}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mt-4 mb-1">Gap Breakdown</div>
            <ul className="space-y-1.5">
              {gap.breakdown.map((b) => (
                <li key={b.driver} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{b.driver}</span>
                  <span className={clsx('font-medium', (b.gap ?? 0) >= 0 ? 'text-good' : 'text-bad')}>
                    {fmtSigned(b.gap, 'pp')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {insights?.margin_banner && (
        <div className="mt-3 flex items-start gap-2 bg-ai/5 border border-ai/20 rounded-xl px-3 py-2 text-xs text-gray-700">
          <Icon name="sparkles" size={15} className="text-ai mt-0.5 shrink-0" />
          <span>{insights.margin_banner}</span>
        </div>
      )}
      {!expanded && (
        <div className="mt-2 text-right"><span className="link-more">View full margin breakdown →</span></div>
      )}
    </div>
  );
}
