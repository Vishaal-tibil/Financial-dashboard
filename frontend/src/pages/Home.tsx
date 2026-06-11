import { ExecutiveCockpit } from '../components/cockpit/ExecutiveCockpit';
import { FinancialBenchmark } from '../components/financial/FinancialBenchmark';
import { OperationalBenchmark } from '../components/operational/OperationalBenchmark';
import { CapitalEfficiencyMatrix } from '../components/capital/CapitalEfficiencyMatrix';
import { MarginWaterfall } from '../components/margin/MarginWaterfall';
import { AIInsights } from '../components/insights/AIInsights';
import { CompetitorIntelFeed } from '../components/feed/CompetitorIntelFeed';

export function Home() {
  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <ExecutiveCockpit />

      {/* Row A: 5 / 4 / 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5"><FinancialBenchmark /></div>
        <div className="lg:col-span-4"><OperationalBenchmark /></div>
        <div className="lg:col-span-3"><AIInsights /></div>
      </div>

      {/* Row B: 6 / 6 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CapitalEfficiencyMatrix />
        <MarginWaterfall />
      </div>

      {/* Row C: full width */}
      <CompetitorIntelFeed />
    </div>
  );
}
