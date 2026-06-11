import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { Icon } from '../ui/Icon';
import { Skeleton, ErrorState } from '../ui/states';
import { useBenchmark, useInsights } from '../../api/hooks';
import { colorFor } from '../../lib/format';

const QUADRANTS = [
  { pos: 'top-3 left-3', text: 'High Margin / Low Capital · Best-in-Class', align: 'text-left' },
  { pos: 'top-3 right-3', text: 'High Margin / High Capital · Scale Leaders', align: 'text-right' },
  { pos: 'bottom-10 left-3', text: 'Low Margin / Low Capital · Niche Players', align: 'text-left' },
  { pos: 'bottom-10 right-3', text: 'Low Margin / High Capital · Value Destroyers', align: 'text-right' },
];

export function CapitalEfficiencyMatrix({ expanded = false }: { expanded?: boolean }) {
  const { data, isLoading, isError, error, refetch } = useBenchmark();
  const { data: insights } = useInsights();

  if (isLoading) return <div className="card"><Skeleton className="h-72" /></div>;
  if (isError) return <div className="card"><ErrorState message={(error as Error).message} onRetry={refetch} /></div>;
  if (!data) return null;

  const points = data.capitalEfficiency
    .filter((c) => c.capitalEmployed != null && c.ebitMargin != null)
    .map((c, i) => ({ ...c, fill: colorFor(i), z: c.revenue ?? 1 }));

  return (
    <div className="card h-full flex flex-col">
      <div className="section-title text-brand">
        <Icon name="scatter" size={15} /> Capital Efficiency Matrix <span className="text-gray-400 normal-case font-normal">(TTM)</span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500">Profitability vs Capital Employed Efficiency</p>
        <span className="text-[11px] text-gray-400">○ Bubble size = Revenue (₹ Cr)</span>
      </div>

      <div className="relative flex-1">
        {QUADRANTS.map((q) => (
          <div key={q.text} className={`absolute ${q.pos} ${q.align} z-10 text-[9px] leading-tight text-gray-400 max-w-[40%] pointer-events-none`}>
            {q.text}
          </div>
        ))}
        <ResponsiveContainer width="100%" height={expanded ? 460 : 300}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              type="number" dataKey="capitalEmployed" name="Capital Employed"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              label={{ value: 'Capital Employed (₹ Cr)', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#9ca3af' }}
            />
            <YAxis
              type="number" dataKey="ebitMargin" name="EBIT Margin"
              tick={{ fontSize: 10, fill: '#6b7280' }} unit="%"
              label={{ value: 'EBIT Margin (%)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#9ca3af' }}
            />
            <ZAxis type="number" dataKey="z" range={[200, 1600]} name="Revenue" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(v: any, n: any) => [typeof v === 'number' ? v.toLocaleString() : v, n]}
              labelFormatter={() => ''}
            />
            <Scatter data={points}>
              {points.map((p) => (
                <Cell key={p.company_id} fill={p.fill} fillOpacity={p.isYou ? 0.9 : 0.55} stroke={p.isYou ? '#0F1B3D' : 'none'} strokeWidth={p.isYou ? 2 : 0} />
              ))}
              <LabelList dataKey="company" position="top" style={{ fontSize: 10, fill: '#374151' }} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {insights?.capital_banner && (
        <div className="mt-3 flex items-start gap-2 bg-ai/5 border border-ai/20 rounded-xl px-3 py-2 text-xs text-gray-700">
          <Icon name="sparkles" size={15} className="text-ai mt-0.5 shrink-0" />
          <span>{insights.capital_banner}</span>
        </div>
      )}
    </div>
  );
}
