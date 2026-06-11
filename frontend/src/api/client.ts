import type {
  BenchmarkResponse,
  CompanySummary,
  FeedCard,
  InsightsResponse,
} from './types';

const BASE = '/api';

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => jsonFetch<{ status: string; groq_configured: boolean; tavily_configured: boolean }>(`${BASE}/health`),

  listCompanies: () => jsonFetch<CompanySummary[]>(`${BASE}/companies`),

  uploadCompany: async (file: File): Promise<CompanySummary> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/companies/upload`, { method: 'POST', body: form });
    if (!res.ok) {
      let detail = 'Upload failed';
      try {
        detail = (await res.json()).detail || detail;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    return res.json();
  },

  deleteCompany: (id: string) =>
    jsonFetch<{ deleted: string }>(`${BASE}/companies/${id}`, { method: 'DELETE' }),

  benchmark: (body: { your_company_id: string; competitor_ids: string[]; fiscal_year: string | null }) =>
    jsonFetch<BenchmarkResponse>(`${BASE}/metrics/benchmark`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  insights: (body: { your_company_id: string; competitor_ids: string[]; fiscal_year: string | null }) =>
    jsonFetch<InsightsResponse>(`${BASE}/insights`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  feedCached: (competitorIds: string[]) =>
    jsonFetch<{ cards: FeedCard[]; cached: boolean }>(
      `${BASE}/feed?competitor_ids=${encodeURIComponent(competitorIds.join(','))}`,
    ),

  reportUrl: `${BASE}/report`,
  chatUrl: `${BASE}/chat`,
  chatResetUrl: `${BASE}/chat/reset`,
  feedRefreshStreamUrl: `${BASE}/feed/refresh/stream`,
};

/** POST a body and stream back SSE `data:` JSON events via fetch (so we can use POST). */
export async function streamSSE(
  url: string,
  body: unknown,
  onEvent: (event: any) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`Stream failed: ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const flush = (raw: string) => {
    // an SSE event may contain multiple `data:` lines (per spec they concatenate)
    const dataLines = raw
      .split(/\r?\n/)
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).replace(/^ /, ''));
    if (dataLines.length === 0) return;
    const payload = dataLines.join('\n').trim();
    if (!payload) return;
    try {
      onEvent(JSON.parse(payload));
    } catch {
      /* ignore malformed */
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // sse-starlette separates events with CRLF (\r\n\r\n); tolerate plain \n\n too
    const events = buffer.split(/\r\n\r\n|\n\n/);
    buffer = events.pop() ?? '';
    for (const ev of events) flush(ev);
  }
  if (buffer.trim()) flush(buffer);
}
