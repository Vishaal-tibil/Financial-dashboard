import clsx from 'clsx';
import { Icon } from '../ui/Icon';
import { Skeleton, ErrorState } from '../ui/states';
import { useInsights } from '../../api/hooks';
import type { Insight } from '../../api/types';

const SEVERITY: Record<string, string> = {
  positive: 'bg-good/10 text-good',
  warning: 'bg-amber-100 text-amber-600',
  negative: 'bg-bad/10 text-bad',
  info: 'bg-ai/10 text-ai',
};

const ICONS: Record<string, string> = {
  'trending-up': 'trendingUp',
  alert: 'alert',
  cash: 'cash',
  target: 'target',
  info: 'info',
  lightbulb: 'lightbulb',
};

function InsightRow({ ins, expanded }: { ins: Insight; expanded: boolean }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className={clsx('w-7 h-7 rounded-full flex items-center justify-center shrink-0', SEVERITY[ins.severity] ?? SEVERITY.info)}>
        <Icon name={ICONS[ins.icon] ?? 'lightbulb'} size={14} />
      </span>
      <div>
        <div className="text-sm font-semibold text-gray-800">{ins.title}</div>
        {expanded && <div className="text-xs text-gray-500 mt-0.5">{ins.body}</div>}
        {!expanded && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ins.body}</div>}
      </div>
    </li>
  );
}

export function AIInsights({ expanded = false }: { expanded?: boolean }) {
  const { data, isLoading, isError, error, refetch } = useInsights();

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <div className="section-title text-ai">
          <Icon name="sparkles" size={15} /> AI Insights
        </div>
        {data && !data.generated && (
          <span className="pill bg-gray-100 text-gray-500 text-[10px]">heuristic</span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3 mt-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
        </div>
      )}
      {isError && <ErrorState message={(error as Error).message} onRetry={refetch} />}

      {data && (
        <>
          <ul className="divide-y divide-gray-50 flex-1">
            {(expanded ? data.insights : data.insights.slice(0, 4)).map((ins, i) => (
              <InsightRow key={i} ins={ins} expanded={expanded} />
            ))}
          </ul>
          {data.error && <p className="text-[11px] text-amber-600 mt-2">LLM note: {data.error}</p>}
          {!expanded && data.insights.length > 4 && (
            <div className="mt-1 text-right"><span className="link-more">View all insights →</span></div>
          )}
        </>
      )}
    </div>
  );
}
