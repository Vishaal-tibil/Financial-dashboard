import { create } from 'zustand';

export type TabKey =
  | 'home'
  | 'cockpit'
  | 'financial'
  | 'operational'
  | 'capital'
  | 'margin'
  | 'insights'
  | 'feed'
  | 'chat'
  | 'upload';

interface SelectionState {
  yourCompany: string | null;
  competitors: string[];
  fiscalYear: string | null;
  activeTab: TabKey;
  sidebarCollapsed: boolean;

  setYourCompany: (id: string | null) => void;
  addCompetitor: (id: string) => void;
  removeCompetitor: (id: string) => void;
  setFiscalYear: (fy: string | null) => void;
  setActiveTab: (tab: TabKey) => void;
  toggleSidebar: () => void;
}

export const useSelections = create<SelectionState>((set) => ({
  yourCompany: null,
  competitors: [],
  fiscalYear: null,
  activeTab: 'home',
  sidebarCollapsed: false,

  setYourCompany: (id) =>
    set((s) => ({
      yourCompany: id,
      competitors: s.competitors.filter((c) => c !== id),
    })),
  addCompetitor: (id) =>
    set((s) =>
      s.competitors.includes(id) || id === s.yourCompany
        ? s
        : { competitors: [...s.competitors, id] },
    ),
  removeCompetitor: (id) =>
    set((s) => ({ competitors: s.competitors.filter((c) => c !== id) })),
  setFiscalYear: (fy) => set({ fiscalYear: fy }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
