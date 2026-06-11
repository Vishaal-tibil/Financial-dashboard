import { useState } from 'react';
import { Icon } from '../ui/Icon';
import { useCompanies } from '../../api/hooks';
import { useSelections } from '../../store/selections';

export function SelectionBar() {
  const { data: companies } = useCompanies();
  const { yourCompany, competitors, setYourCompany, addCompetitor, removeCompetitor, setActiveTab } = useSelections();
  const [adding, setAdding] = useState(false);

  const list = companies ?? [];
  const nameOf = (id: string) => list.find((c) => c.company_id === id)?.company_name ?? id;
  const available = list.filter((c) => c.company_id !== yourCompany && !competitors.includes(c.company_id));

  if (list.length === 0) {
    return (
      <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm text-gray-500">No companies uploaded yet.</span>
        <button onClick={() => setActiveTab('upload')} className="text-sm font-medium text-brand hover:underline flex items-center gap-1">
          <Icon name="upload" size={15} /> Upload a Screener export
        </button>
      </div>
    );
  }

  return (
    <div className="sticky top-16 z-10 px-6 py-3 bg-white border-b border-gray-200 flex items-center gap-4 flex-wrap">
      {/* Your Company */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
          <Icon name="building" size={18} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Your Company</div>
          <div className="relative">
            <select
              value={yourCompany ?? ''}
              onChange={(e) => setYourCompany(e.target.value || null)}
              className="appearance-none font-semibold text-sm text-gray-800 bg-transparent pr-5 focus:outline-none cursor-pointer"
            >
              <option value="">Select…</option>
              {list.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {c.company_name}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={13} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="h-9 w-px bg-gray-200" />

      <div className="text-xs font-medium text-gray-500">
        Comparing with <span className="text-gray-800">({competitors.length})</span>
      </div>

      {/* Competitor chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {competitors.map((id) => (
          <span key={id} className="pill bg-gray-100 text-gray-700 pr-1">
            {nameOf(id)}
            <button onClick={() => removeCompetitor(id)} className="ml-1 text-gray-400 hover:text-bad">
              <Icon name="x" size={13} />
            </button>
          </span>
        ))}

        <div className="relative">
          <button
            onClick={() => setAdding((v) => !v)}
            disabled={available.length === 0}
            className="pill border border-dashed border-gray-300 text-gray-600 hover:border-brand hover:text-brand disabled:opacity-40"
          >
            <Icon name="plus" size={13} /> Add Competitor
          </button>
          {adding && available.length > 0 && (
            <div className="absolute z-30 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-64 overflow-y-auto">
              {available.map((c) => (
                <button
                  key={c.company_id}
                  onClick={() => {
                    addCompetitor(c.company_id);
                    setAdding(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  {c.company_name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
