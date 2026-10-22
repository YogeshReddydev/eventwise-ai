import React, { useState } from 'react';
import { Calendar, CheckCircle2, ChevronDown, ChevronUp, LineChart as ChartIcon, Users, Wallet } from 'lucide-react';
import { EventPlan } from '../types.ts';
import { formatINR } from '../planner.ts';
import { SpendingVelocityChart } from './SpendingVelocityChart.tsx';

interface MetricsOverviewProps {
  plan: EventPlan;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ plan }) => {
  const [showChart, setShowChart] = useState<boolean>(true);
  const completedTasks = plan.tasks.filter((t) => t.done).length;
  const totalTasks = plan.tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <section className="mb-8" aria-label="Budget and Timeline Overview">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-[#eeece3] rounded-2xl p-4 md:p-5 flex flex-col justify-between border border-[#e2dfd4]">
          <div className="flex items-center justify-between text-[#79776f] text-xs font-medium">
            <span>Planned budget</span>
            <Wallet className="w-4 h-4 text-[#405b49]" />
          </div>
          <div className="my-2.5">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-[#24231f]">
              {formatINR(plan.budget)}
            </span>
          </div>
          <span className="text-[11px] text-[#79776f]">All categories combined</span>
        </div>

        <div className="bg-[#eeece3] rounded-2xl p-4 md:p-5 flex flex-col justify-between border border-[#e2dfd4]">
          <div className="flex items-center justify-between text-[#79776f] text-xs font-medium">
            <span>Budget per guest</span>
            <Users className="w-4 h-4 text-[#bd7651]" />
          </div>
          <div className="my-2.5">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-[#24231f]">
              {formatINR(plan.per_guest_budget)}
            </span>
          </div>
          <span className="text-[11px] text-[#79776f]">For {plan.guests} attendees</span>
        </div>

        <div className="bg-[#eeece3] rounded-2xl p-4 md:p-5 flex flex-col justify-between border border-[#e2dfd4]">
          <div className="flex items-center justify-between text-[#79776f] text-xs font-medium">
            <span>Days to go</span>
            <Calendar className="w-4 h-4 text-[#405b49]" />
          </div>
          <div className="my-2.5">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-[#24231f]">
              {plan.days_until_event}
            </span>
          </div>
          <span className="text-[11px] text-[#79776f]">Target timeline visible</span>
        </div>

        <div className="bg-[#eeece3] rounded-2xl p-4 md:p-5 flex flex-col justify-between border border-[#e2dfd4]">
          <div className="flex items-center justify-between text-[#79776f] text-xs font-medium">
            <span>Tasks progress</span>
            <CheckCircle2 className="w-4 h-4 text-[#405b49]" />
          </div>
          <div className="my-2.5">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-[#24231f]">
              {completedTasks} / {totalTasks}
            </span>
          </div>
          <div>
            <div className="w-full bg-[#dfdcd0] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#405b49] h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="text-[10px] text-[#79776f] mt-1 block">{progressPercent}% completed</span>
          </div>
        </div>
      </div>

      {/* Spending Velocity Recharts Line Chart */}
      <div className="mt-3 bg-white rounded-2xl border border-[#e9e5db] p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChartIcon className="w-4 h-4 text-[#405b49]" />
            <span className="text-xs font-bold text-[#24231f]">
              Velocity & Runway: Days to Go vs. Budget Remaining
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowChart(!showChart)}
            className="text-xs text-[#79776f] hover:text-[#24231f] flex items-center gap-1 font-semibold cursor-pointer"
          >
            <span>{showChart ? 'Hide chart' : 'Show chart'}</span>
            {showChart ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showChart && <SpendingVelocityChart plan={plan} />}
      </div>
    </section>
  );
};
