import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SelectionBar } from './components/layout/SelectionBar';
import { Home } from './pages/Home';
import { ExecutiveCockpit } from './components/cockpit/ExecutiveCockpit';
import { FinancialBenchmark } from './components/financial/FinancialBenchmark';
import { OperationalBenchmark } from './components/operational/OperationalBenchmark';
import { CapitalEfficiencyMatrix } from './components/capital/CapitalEfficiencyMatrix';
import { MarginWaterfall } from './components/margin/MarginWaterfall';
import { AIInsights } from './components/insights/AIInsights';
import { CompetitorIntelFeed } from './components/feed/CompetitorIntelFeed';
import { AskAIAssistant } from './components/chat/AskAIAssistant';
import { UploadManager } from './components/upload/UploadManager';
import { useSelections } from './store/selections';
import { useCompanies } from './api/hooks';
import { EmptyState } from './components/ui/states';

function NeedsSelection({ children }: { children: React.ReactNode }) {
  const yourCompany = useSelections((s) => s.yourCompany);
  const setActiveTab = useSelections((s) => s.setActiveTab);
  const { data: companies, isLoading } = useCompanies();

  if (isLoading) return null;
  if ((companies ?? []).length === 0) {
    return (
      <EmptyState
        icon="upload"
        title="No companies uploaded yet"
        hint="Upload one Screener.in .xlsx per company to start benchmarking."
        action={
          <button onClick={() => setActiveTab('upload')} className="bg-brand text-white text-sm px-4 py-2 rounded-lg">
            Go to Upload
          </button>
        }
      />
    );
  }
  if (!yourCompany) {
    return (
      <EmptyState
        icon="building"
        title="Select your company"
        hint="Pick a 'Your Company' from the selection bar above, then add competitors to compare."
      />
    );
  }
  return <>{children}</>;
}

export default function App() {
  const activeTab = useSelections((s) => s.activeTab);

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <NeedsSelection><Home /></NeedsSelection>;
      case 'cockpit':
        return <NeedsSelection><ExecutiveCockpit expanded /></NeedsSelection>;
      case 'financial':
        return <NeedsSelection><FinancialBenchmark expanded /></NeedsSelection>;
      case 'operational':
        return <NeedsSelection><OperationalBenchmark expanded /></NeedsSelection>;
      case 'capital':
        return <NeedsSelection><CapitalEfficiencyMatrix expanded /></NeedsSelection>;
      case 'margin':
        return <NeedsSelection><MarginWaterfall expanded /></NeedsSelection>;
      case 'insights':
        return <NeedsSelection><AIInsights expanded /></NeedsSelection>;
      case 'feed':
        return <CompetitorIntelFeed expanded />;
      case 'chat':
        return <AskAIAssistant />;
      case 'upload':
        return <UploadManager />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <SelectionBar />
        <main className="flex-1 overflow-y-auto p-6">{renderTab()}</main>
      </div>
    </div>
  );
}
