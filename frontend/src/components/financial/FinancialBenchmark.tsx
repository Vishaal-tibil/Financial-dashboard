import { useMemo, useState } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import clsx from 'clsx';
import { Icon } from '../ui/Icon';
import { Skeleton, ErrorState } from '../ui/states';
import { useBenchmark } from '../../api/hooks';
import { colorFor } from '../../lib/format';

export function FinancialBenchmark({ expanded = false }: { expanded?: boolean }) {
  const { data, isLoading, isError, error, refetch } = useBenchmark();
  const [mode, setMode] = useState<'absolute' | 'indexed'>('absolute');

  const trend = useMemo(() => {
    if (!data) return [];
    if (mode === 'absolute') return data.financial.revenueTrend;
    // indexed: first non-null value per series = 100
    const bases: Record<string, number> = {};
    data.financial.seriesNames.forEach((name) => {
      const first = data.financial.revenueTrend.find((r) => r[name] != null);
      if (first) bases[name] = first[name] as number;
    });
    return data.financial.revenueTrend.map((row) => {
      const out: Record<string, any> = { period: row.period };
      data.financial.seriesNames.forEach((name) => {
        out[name] = row[name] != null && bases[name] ? Math.round(((row[name] as number) / bases[name]) * 100) : null;
      });
      return out;
    });
  }, [data, mode]);

  if (isLoading) return <div className="card"><Skeleton className="h-64" /></div>;
  if (isError) return <div className="card"><ErrorState message={(error as Error).message} onRetry={refetch} /></div>;
  if (!data) return null;

  const radarData = data.financial.radar;

  return (
    <div className="card h-full flex flex-col">
      <div className="section-title text-brand mb-3">
        <Icon name="bars" size={15} /> Financial Benchmarking <span className="text-gray-400 normal-case font-normal">(TTM)</span>
      </div>

      <div className={clsx('grid gap-4 flex-1', expanded ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 xl:grid-cols-2')}>
        {/* Radar */}
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Financial Health Radar</div>
          <ResponsiveContainer width="100%" height={expanded ? 340 : 240}>
            <RadarChart data={radarData} outerRadius="70%">
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar name="Your Company" dataKey="you" stroke="#2D5BFF" fill="#2D5BFF" fillOpacity={0.25} />
              <Radar name="Best in Set" dataKey="bestInSet" stroke="#16A34A" fill="#16A34A" fillOpacity={0.1} />
              <Radar name="Industry Median" dataKey="industryMedian" stroke="#9CA3AF" fill="#9CA3AF" fillOpacity={0.08} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue trend */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold text-gray-600">Financial Trend – Revenue (₹ Cr)</div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-[11px]">
              {(['absolute', 'indexed'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={clsx('px-2 py-1 capitalize', mode === m ? 'bg-brand text-white' : 'text-gray-500')}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={expanded ? 340 : 240}>
            <LineChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {data.financial.seriesNames.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name} stroke={colorFor(i)} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {!expanded && (
        <div className="mt-2 text-right">
          <span className="link-more">View all financial benchmarks →</span>
        </div>
      )}
    </div>
  );
}
