import { useRef, useState, useEffect } from 'react';
import clsx from 'clsx';
import { Icon } from '../ui/Icon';
import { api, streamSSE } from '../../api/client';
import { useSelections } from '../../store/selections';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
}

const SESSION_ID = 'default';
const SUGGESTIONS = [
  'Where do I lag the best competitor on margins?',
  'Which competitor is most capital efficient and why?',
  'Summarize my working-capital position vs peers.',
];

export function AskAIAssistant() {
  const { yourCompany, competitors } = useSelections();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, toolStatus]);

  async function send(question: string) {
    if (!question.trim() || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: question }, { role: 'assistant', text: '' }]);
    setBusy(true);
    setToolStatus(null);
    try {
      await streamSSE(
        api.chatUrl,
        { question, your_company_id: yourCompany, competitor_ids: competitors, session_id: SESSION_ID },
        (ev) => {
          if (ev.type === 'tool') setToolStatus(`Searching the web: "${ev.query}"…`);
          else if (ev.type === 'token') {
            setToolStatus(null);
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { role: 'assistant', text: copy[copy.length - 1].text + ev.text };
              return copy;
            });
          } else if (ev.type === 'error') {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { role: 'assistant', text: `⚠️ ${ev.message}` };
              return copy;
            });
          }
        },
      );
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', text: `⚠️ ${(e as Error).message}` };
        return copy;
      });
    } finally {
      setBusy(false);
      setToolStatus(null);
    }
  }

  async function reset() {
    await fetch(api.chatResetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: SESSION_ID }),
    });
    setMessages([]);
  }

  return (
    <div className="card flex flex-col h-[calc(100vh-220px)] min-h-[480px]">
      <div className="flex items-center justify-between mb-3">
        <div className="section-title text-ai">
          <Icon name="chat" size={15} /> Ask AI Assistant
        </div>
        <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
          <Icon name="refresh" size={14} /> Reset
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <div className="w-12 h-12 rounded-2xl bg-ai/10 text-ai flex items-center justify-center mx-auto mb-3">
              <Icon name="chat" size={24} />
            </div>
            <p className="text-sm text-gray-500">Ask anything about your selected companies. I can also search the web.</p>
            <div className="flex flex-col items-center gap-2 mt-4">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="text-xs text-brand bg-brand/5 hover:bg-brand/10 px-3 py-1.5 rounded-full">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={clsx(
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
                m.role === 'user' ? 'bg-brand text-white' : 'bg-gray-50 text-gray-800',
              )}
            >
              {m.text || <span className="text-gray-400">…</span>}
            </div>
          </div>
        ))}
        {toolStatus && (
          <div className="flex items-center gap-2 text-xs text-ai">
            <Icon name="search" size={14} className="animate-pulse" /> {toolStatus}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about margins, returns, news…"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ai/30"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-ai text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
