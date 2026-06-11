import clsx from 'clsx';
import { Icon } from '../ui/Icon';
import { Skeleton, ErrorState } from '../ui/states';
import { useBenchmark } from '../../api/hooks';
import type { OperationalRow } from '../../api/types';

function VsBest({ row }: { row: OperationalRow }) {
  if (row.is_na || row.vsBestValue === null) return <span className="text-gray-300">—</span>;
  // good if moving in the better direction relative to best (higher/lower)
  const v = row.vsBestValue;
  const good = row.direction === 'higher' ? v >= 0 : v <= 0;
  return (
    <span className={clsx('inline-flex items-center gap-0.5 font-medium', good ? 'text-good' : 'text-bad')}>
      <Icon name={v >= 0 ? 'arrowUp' : 'arrowDown'} size={12} />
      {row.vsBest}
    </span>
  );
}

export function OperationalBenchmark({ expanded = false }: { expanded?: boolean }) {
  const { data, isLoading, isError, error, refetch } = useBenchmark();

  if (isLoading) return <div className="card"><Skeleton className="h-64" /></div>;
  if (isError) return <div className="card"><ErrorState message={(error as Error).message} onRetry={refetch} /></div>;
  if (!data) return null;

  return (
    <div className="card h-full flex flex-col">
      <div className="section-title text-brand mb-3">
        <Icon name="table" size={15} /> Operational Benchmarking
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
              <th className="text-left font-semibold py-2">KPI</th>
              <th className="text-right font-semibold py-2">Your Company</th>
              <th className="text-right font-semibold py-2">Best in Set</th>
              <th className="text-right font-semibold py-2">Ind. Median</th>
              <th className="text-right font-semibold py-2">vs Best</th>
            </tr>
          </thead>
          <tbody>
            {data.operational.rows.map((row) => (
              <tr key={row.kpi} className="border-b border-gray-50 last:border-0">
                <td className={clsx('py-2.5 text-gray-700', row.is_na && 'text-gray-400')}>
                  {row.kpi}
                  {row.is_na && <span className="ml-1 pill bg-gray-100 text-gray-400 text-[10px]">N/A</span>}
                </td>
                <td className="py-2.5 text-right font-medium text-gray-800">{row.you}</td>
                <td className="py-2.5 text-right text-gray-600">{row.bestInSet}</td>
                <td className="py-2.5 text-right text-gray-600">{row.industryMedian}</td>
                <td className="py-2.5 text-right"><VsBest row={row} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!expanded && (
        <div className="mt-2 text-right">
          <span className="link-more">View all operational KPIs →</span>
        </div>
      )}
    </div>
  );
}
