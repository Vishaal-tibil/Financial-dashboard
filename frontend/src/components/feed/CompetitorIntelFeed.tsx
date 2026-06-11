import { useState } from 'react';
import clsx from 'clsx';
import { Icon } from '../ui/Icon';
import { EmptyState } from '../ui/states';
import { api, streamSSE } from '../../api/client';
import { useCachedFeed } from '../../api/hooks';
import { useSelections } from '../../store/selections';
import type { FeedCard } from '../../api/types';

const SENTIMENT: Record<string, string> = {
  Positive: 'bg-good/10 text-good',
  Negative: 'bg-bad/10 text-bad',
  Neutral: 'bg-gray-100 text-gray-500',
};

function Card({ c }: { c: FeedCard }) {
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noreferrer"
      className="block bg-white border border-gray-100 rounded-2xl p-4 shadow-card hover:border-brand/40 transition-colors min-w-0"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-navy/5 text-navy flex items-center justify-center shrink-0">
            <Icon name="building" size={15} />
          </div>
          <span className="text-sm font-semibold text-gray-800 truncate">{c.company_name}</span>
        </div>
        <span className={clsx('pill text-[10px]', SENTIMENT[c.sentiment] ?? SENTIMENT.Neutral)}>{c.sentiment}</span>
      </div>
      <div className="text-sm font-medium text-gray-700 line-clamp-2">{c.title}</div>
      <p className="text-xs text-gray-500 mt-1 line-clamp-3">{c.summary}</p>
      <div className="flex items-center justify-between mt-3 text-[11px] text-gray-400">
        <span className="pill bg-gray-50 text-gray-500">{c.category}</span>
        <span>{c.published_date ? new Date(c.published_date).toLocaleDateString() : ''}</span>
      </div>
    </a>
  );
}

export function CompetitorIntelFeed({ expanded = false }: { expanded?: boolean }) {
  const competitors = useSelections((s) => s.competitors);
  const { data, refetch } = useCachedFeed();
  const [streaming, setStreaming] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [liveCards, setLiveCards] = useState<FeedCard[] | null>(null);
  const [expandedView, setExpandedView] = useState(expanded);

  const cards = liveCards ?? data?.cards ?? [];
  const shown = expandedView ? cards : cards.slice(0, 4);

  async function refresh() {
    if (competitors.length === 0) return;
    setStreaming(true);
    setProgress('Starting…');
    try {
      await streamSSE(api.feedRefreshStreamUrl, { competitor_ids: competitors }, (ev) => {
        if (ev.type === 'progress') setProgress(ev.message);
        else if (ev.type === 'done') {
          setLiveCards(ev.cards);
          setProgress(null);
        }
      });
      refetch();
    } catch (e) {
      setProgress(`Error: ${(e as Error).message}`);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="section-title text-brand">
          <Icon name="news" size={15} /> Competitor Intelligence Feed
          <span className="text-gray-400 normal-case font-normal">Recent Public Updates</span>
        </div>
        <button
          onClick={refresh}
          disabled={streaming || competitors.length === 0}
          className="text-xs font-medium text-brand hover:underline flex items-center gap-1 disabled:opacity-40"
        >
          <Icon name="refresh" size={14} className={streaming ? 'animate-spin' : ''} />
          {streaming ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {progress && <div className="text-xs text-gray-500 mb-3 flex items-center gap-2"><Icon name="search" size={13} /> {progress}</div>}

      {competitors.length === 0 ? (
        <EmptyState icon="news" title="Add competitors to see news" hint="Select competitors in the bar above, then click Refresh to fetch recent updates." />
      ) : cards.length === 0 ? (
        <EmptyState
          icon="news"
          title="No updates cached yet"
          hint="Click Refresh to fetch the latest competitor news (requires TAVILY_API_KEY)."
          action={<button onClick={refresh} className="bg-brand text-white text-sm px-4 py-2 rounded-lg">Refresh feed</button>}
        />
      ) : (
        <>
          <div className={clsx('grid gap-4', expandedView ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4')}>
            {shown.map((c, i) => <Card key={`${c.url}-${i}`} c={c} />)}
          </div>
          {!expanded && cards.length > 4 && (
            <div className="mt-3 text-right">
              <button onClick={() => setExpandedView((v) => !v)} className="link-more">
                {expandedView ? 'Show less' : `View all updates (${cards.length}) →`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
