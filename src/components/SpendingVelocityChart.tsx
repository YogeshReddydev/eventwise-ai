import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendingDown, Activity, ShieldAlert, Sparkles } from 'lucide-react';
import { EventPlan } from '../types.ts';
import { formatINR } from '../planner.ts';

interface SpendingVelocityChartProps {
  plan: EventPlan;
}

export const SpendingVelocityChart: React.FC<SpendingVelocityChartProps> = ({ plan }) => {
  const totalDays = Math.max(1, plan.days_until_event);
  const totalBudget = plan.budget;

  const committedSpend = useMemo(() => {
    return plan.vendors
      .filter((v) => v.status === 'Booked' || v.status === 'Paid')
      .reduce((sum, v) => sum + (v.quote || 0), 0);
  }, [plan.vendors]);

  const contingencyAmount = useMemo(() => {
    return plan.categories.find((c) => c.name === 'Contingency')?.amount || totalBudget * 0.1;
  }, [plan.categories, totalBudget]);

  const dailyVelocity = totalDays > 0 ? Math.round(totalBudget / totalDays) : 0;
  const currentRemaining = Math.max(0, totalBudget - committedSpend);

  const chartData = useMemo(() => {
    const steps = 5;
    const points = [];

    for (let i = 0; i <= steps; i++) {
      const fraction = i / steps;
      const daysToGo = Math.round(totalDays * (1 - fraction));
      const dayLabel = daysToGo === 0 ? 'Event' : `${daysToGo}d`;

      // S-curve planned burn: slower at start, accelerates during mid-phase bookings, flattens near end
      const burnCurve = Math.pow(fraction, 1.15);
      const plannedBurn = (totalBudget - contingencyAmount) * burnCurve;
      const plannedRemaining = Math.max(contingencyAmount, Math.round(totalBudget - plannedBurn));

      // Current actual spending velocity runway based on current vendor bookings
      const actualRemainingAtStep = Math.max(
        0,
        Math.round(totalBudget - committedSpend * (fraction === 0 ? 0 : 0.4 + fraction * 0.6))
      );

      points.push({
        name: dayLabel,
        daysToGo,
        'Target Runway': plannedRemaining,
        'Remaining Budget': i === 0 ? totalBudget : actualRemainingAtStep,
      });
    }

    return points;
  }, [totalDays, totalBudget, committedSpend, contingencyAmount]);

  const formatYAxis = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
    return `₹${val}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#fffefa] p-3 rounded-xl border border-[#dedad0] shadow-md text-xs">
          <p className="font-bold text-[#24231f] mb-1.5 border-b border-[#f0ede4] pb-1">
            {label === 'Event' ? 'Event Day' : `${label} to go`}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <p
                key={`item-${index}`}
                className="flex items-center justify-between gap-3 text-[11px]"
                style={{ color: entry.color }}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span>{entry.name}:</span>
                </span>
                <span className="font-bold font-mono">{formatINR(entry.value)}</span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-4 pt-4 border-t border-[#dfdcd0] bg-[#faf8f2] rounded-xl p-4 border border-[#e8e4d8]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#405b49]" />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#bd7651]">
              Spending Velocity
            </span>
            <h3 className="text-xs font-bold text-[#24231f]">
              Days to Go vs. Budget Remaining Runway
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-[#e9eee8] text-[#405b49] font-medium border border-[#d6dfd5]">
            Target Pace: ~{formatINR(dailyVelocity)}/day
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#fbf1ea] text-[#bd7651] font-semibold border border-[#f4dfd4]">
            Uncommitted: {formatINR(currentRemaining)}
          </span>
        </div>
      </div>

      <div className="w-full h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e4d8" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#79776f"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#dedad0' }}
            />
            <YAxis
              stroke="#79776f"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxis}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
              iconType="circle"
              iconSize={8}
            />
            <Line
              type="monotone"
              dataKey="Target Runway"
              stroke="#405b49"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: '#405b49' }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="Remaining Budget"
              stroke="#bd7651"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#bd7651' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-[#969187] mt-1 text-right">
        Tracking projected spend milestones ensures contingency remains untouched until needed.
      </p>
    </div>
  );
};
