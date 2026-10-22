import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, ChevronDown, ChevronUp, LineChart as ChartIcon, Users, Wallet } from 'lucide-react';
import { EventPlan } from '../types.ts';
import { formatINR } from '../planner.ts';
import { SpendingVelocityChart } from './SpendingVelocityChart.tsx';

interface MetricsOverviewProps {
  plan: EventPlan;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ plan }) => {
  const [showChart, setShowChart] = useState<boolean>(true);

  const { completedTasks, totalTasks, progressPercent } = useMemo(() => {
    const completed = plan.tasks.filter((t) => t.done).length;
    const total = plan.tasks.length;
    return {
      completedTasks: completed,
      totalTasks: total,
      progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [plan.tasks]);

  return (
    <section className="mb-8" aria-label="Budget and Timeline Overview">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-[#eeece3] rounded-2xl p-4 md:p-5 flex flex-col justify-between border border-[#e2dfd4]">
          <div className="flex items-center justify-between text-[#57554e] text-xs font-medium">
            <span>Planned budget</span>
            <Wallet className="w-4 h-4 text-[#354c3c]" aria-hidden="true" />
          </div>
          <div className="my-2.5">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-[#1f1e1a] font-mono">
              {formatINR(plan.budget)}
            </span>
          </div>
          <span className="text-[11px] text-[#57554e]">All categories combined</span>
        </div>

        <div className="bg-[#eeece3] rounded-2xl p-4 md:p-5 flex flex-col justify-between border border-[#e2dfd4]">
          <div className="flex items-center justify-between text-[#57554e] text-xs font-medium">
            <span>Budget per guest</span>
            <Users className="w-4 h-4 text-[#9c4f2b]" aria-hidden="true" />
          </div>
          <div className="my-2.5">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-[#1f1e1a] font-mono">
              {formatINR(plan.per_guest_budget)}
            </span>
          </div>
          <span className="text-[11px] text-[#57554e]">For {plan.guests} attendees</span>
        </div>

        <div className="bg-[#eeece3] rounded-2xl p-4 md:p-5 flex flex-col justify-between border border-[#e2dfd4]">
          <div className="flex items-center justify-between text-[#57554e] text-xs font-medium">
            <span>Days to go</span>
            <Calendar className="w-4 h-4 text-[#354c3c]" aria-hidden="true" />
          </div>
          <div className="my-2.5">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-[#1f1e1a] font-mono">
              {plan.days_until_event}
            </span>
          </div>
          <span className="text-[11px] text-[#57554e]">Target timeline visible</span>
        </div>

        <div className="bg-[#eeece3] rounded-2xl p-4 md:p-5 flex flex-col justify-between border border-[#e2dfd4]">
          <div className="flex items-center justify-between text-[#57554e] text-xs font-medium">
            <span>Tasks progress</span>
            <CheckCircle2 className="w-4 h-4 text-[#354c3c]" aria-hidden="true" />
          </div>
          <div className="my-2.5">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-[#1f1e1a] font-mono">
              {completedTasks} / {totalTasks}
            </span>
          </div>
          <div>
            <div
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Planning tasks completion percentage"
              className="w-full bg-[#dfdcd0] h-1.5 rounded-full overflow-hidden"
            >
              <div
                className="bg-[#354c3c] h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="text-[10px] text-[#57554e] mt-1 block font-medium">{progressPercent}% completed</span>
          </div>
        </div>
      </div>

      {/* Spending Velocity Recharts Line Chart */}
      <div className="mt-3 bg-white rounded-2xl border border-[#dedad0] p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChartIcon className="w-4 h-4 text-[#354c3c]" aria-hidden="true" />
            <span className="text-xs font-bold text-[#1f1e1a]">
              Velocity & Runway: Days to Go vs. Budget Remaining
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowChart(!showChart)}
            aria-expanded={showChart}
            aria-controls="spending-velocity-chart-wrapper"
            className="text-xs text-[#57554e] hover:text-[#1f1e1a] flex items-center gap-1 font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#354c3c] rounded px-1.5 py-0.5"
          >
            <span>{showChart ? 'Hide chart' : 'Show chart'}</span>
            {showChart ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>
        </div>

        {showChart && (
          <div id="spending-velocity-chart-wrapper">
            <SpendingVelocityChart plan={plan} />
          </div>
        )}
      </div>
    </section>
  );
};
