import clsx from 'clsx';
import { Icon } from '../ui/Icon';
import { TabKey, useSelections } from '../../store/selections';

const NAV: { key: TabKey; label: string; icon: string }[] = [
  { key: 'home', label: 'Home (Overview)', icon: 'home' },
  { key: 'cockpit', label: 'Executive Cockpit', icon: 'gauge' },
  { key: 'financial', label: 'Financial Benchmarking', icon: 'bars' },
  { key: 'operational', label: 'Operational Benchmarking', icon: 'table' },
  { key: 'capital', label: 'Capital Efficiency Matrix', icon: 'scatter' },
  { key: 'margin', label: 'Margin Waterfall', icon: 'layers' },
  { key: 'insights', label: 'AI Insights', icon: 'sparkles' },
  { key: 'feed', label: 'Competitor Intelligence', icon: 'news' },
  { key: 'chat', label: 'Ask AI Assistant', icon: 'chat' },
  { key: 'upload', label: 'Upload Excel', icon: 'upload' },
];

export function Sidebar() {
  const { activeTab, setActiveTab, sidebarCollapsed, toggleSidebar } = useSelections();

  return (
    <aside
      className={clsx(
        'bg-navy text-gray-300 flex flex-col h-screen sticky top-0 transition-all duration-200 shrink-0',
        sidebarCollapsed ? 'w-[72px]' : 'w-[240px]',
      )}
    >
      <div className="flex items-center gap-2 px-4 h-16 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-extrabold shrink-0">
          F
        </div>
        {!sidebarCollapsed && (
          <div className="leading-tight">
            <div className="text-white font-bold text-sm">FinCompare</div>
            <div className="text-[10px] text-gray-400">Executive Cockpit</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {NAV.map((item) => {
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              title={item.label}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active ? 'bg-white text-navy font-semibold shadow-sm' : 'text-gray-300 hover:bg-white/10',
                sidebarCollapsed && 'justify-center px-0',
              )}
            >
              <Icon name={item.icon} size={18} className="shrink-0" />
              {!sidebarCollapsed && <span className="truncate text-left">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <button
        onClick={toggleSidebar}
        className="flex items-center gap-2 px-4 h-12 border-t border-white/10 text-gray-400 hover:text-white text-sm"
      >
        <Icon name="collapse" size={18} className={clsx('transition-transform', sidebarCollapsed && 'rotate-180')} />
        {!sidebarCollapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}
