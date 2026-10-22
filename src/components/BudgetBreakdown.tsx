import React, { useMemo, useState } from 'react';
import { AlertCircle, Check, Info, ListFilter, PieChart as PieChartIcon } from 'lucide-react';
import { EventPlan } from '../types.ts';
import { formatINR } from '../planner.ts';
import { BudgetPieChart } from './BudgetPieChart.tsx';

interface BudgetBreakdownProps {
  plan: EventPlan;
  onUpdateCategoryAmount: (index: number, newAmount: number) => void;
  onRebalanceToTotal: () => void;
}

export const BudgetBreakdown: React.FC<BudgetBreakdownProps> = ({
  plan,
  onUpdateCategoryAmount,
  onRebalanceToTotal,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');

  const currentTotal = useMemo(
    () => plan.categories.reduce((sum, c) => sum + c.amount, 0),
    [plan.categories]
  );
  const difference = currentTotal - plan.budget;
  const isBalanced = Math.abs(difference) === 0;

  // Single-pass memoized calculation for vendor commitments
  const { totalSpent, paidAmount, bookedAmount } = useMemo(() => {
    if (!plan.vendors || !Array.isArray(plan.vendors)) {
      return { totalSpent: 0, paidAmount: 0, bookedAmount: 0 };
    }
    let paid = 0;
    let booked = 0;
    for (const v of plan.vendors) {
      if (v.status === 'Paid') paid += v.quote || 0;
      else if (v.status === 'Booked') booked += v.quote || 0;
    }
    return {
      totalSpent: paid + booked,
      paidAmount: paid,
      bookedAmount: booked,
    };
  }, [plan.vendors]);

  const remainingBudget = plan.budget - totalSpent;
  const spentPercent = plan.budget > 0 ? Math.min(100, Math.max(0, (totalSpent / plan.budget) * 100)) : 0;
  const remainingPercent = Math.max(0, 100 - spentPercent);
  const isOverBudget = remainingBudget < 0;

  return (
    <article className="bg-[#fffefa] rounded-2xl border border-[#dedad0] p-6 shadow-xs flex flex-col justify-between" aria-labelledby="budget-breakdown-heading">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9c4f2b]">
              Where it goes
            </span>
            <h2 id="budget-breakdown-heading" className="text-xl font-serif text-[#1f1e1a]">
              Budget breakdown
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: List vs D3 Pie Chart */}
            <div className="flex items-center bg-[#f7f5ef] p-0.5 rounded-lg border border-[#dedad0] text-xs" role="tablist" aria-label="Budget views">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'list'}
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-[#1f1e1a] shadow-2xs font-semibold'
                    : 'text-[#57554e] hover:text-[#1f1e1a]'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" aria-hidden="true" />
                <span>List</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'chart'}
                onClick={() => setViewMode('chart')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'chart'
                    ? 'bg-white text-[#1f1e1a] shadow-2xs font-semibold'
                    : 'text-[#57554e] hover:text-[#1f1e1a]'
                }`}
              >
                <PieChartIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Distribution</span>
              </button>
            </div>

            <span className="text-xs px-2.5 py-1 rounded-full bg-[#e8ede7] text-[#354c3c] font-semibold border border-[#cbd5cb] hidden sm:inline-block">
              Editable plan
            </span>
          </div>
        </div>

        {/* Visual Progress Bar: Total Spent vs. Remaining Budget */}
        <div className="mb-5 p-4 rounded-xl bg-[#faf8f2] border border-[#e8e4d8]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#1f1e1a]">Total Spent / Committed</span>
              <span className="text-[11px] text-[#57554e] font-mono">
                ({spentPercent.toFixed(0)}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-right">
              <span className="font-bold text-[#354c3c]">Remaining Budget</span>
              <span className="text-[11px] text-[#57554e] font-mono">
                ({remainingPercent.toFixed(0)}%)
              </span>
            </div>
          </div>

          {/* Accessible Dual Segmented Progress Bar */}
          <div
            role="progressbar"
            aria-valuenow={Math.round(spentPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${formatINR(totalSpent)} spent (${Math.round(spentPercent)}%), ${formatINR(Math.max(0, remainingBudget))} remaining`}
            className="h-3 w-full bg-[#e8e4d8] rounded-full overflow-hidden flex"
          >
            <div
              className={`h-full transition-all duration-500 rounded-l-full ${
                isOverBudget ? 'bg-[#b43924]' : 'bg-[#9c4f2b]'
              }`}
              style={{ width: `${spentPercent}%` }}
              title={`Spent/Committed: ${formatINR(totalSpent)}`}
            />
            <div
              className="h-full bg-[#354c3c] transition-all duration-500 rounded-r-full"
              style={{ width: `${remainingPercent}%` }}
              title={`Remaining: ${formatINR(Math.max(0, remainingBudget))}`}
            />
          </div>

          <div className="flex items-center justify-between text-xs mt-2 font-mono">
            <div>
              <span className="font-bold text-[#1f1e1a]">{formatINR(totalSpent)}</span>
              {totalSpent > 0 && (
                <span className="text-[10px] text-[#57554e] font-sans ml-1.5 hidden sm:inline">
                  (Paid: {formatINR(paidAmount)} · Booked: {formatINR(bookedAmount)})
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#57554e] font-sans">
              Target: <strong className="text-[#1f1e1a] font-mono">{formatINR(plan.budget)}</strong>
            </span>
            <span className={`font-bold ${isOverBudget ? 'text-[#b43924]' : 'text-[#354c3c]'}`}>
              {formatINR(Math.max(0, remainingBudget))}
            </span>
          </div>
        </div>

        {/* Conditional Rendering: List View vs D3 Pie Chart */}
        {viewMode === 'chart' ? (
          <div className="py-2 mb-6 animate-fadeIn">
            <BudgetPieChart categories={plan.categories} totalBudget={plan.budget} />
          </div>
        ) : (
          <div className="space-y-3.5 mb-6">
            {plan.categories.map((cat, idx) => {
              const pct =
                plan.budget > 0
                  ? Math.min(100, Math.max(0, (cat.amount / plan.budget) * 100))
                  : 0;
              const isContingency = cat.name === 'Contingency';

              return (
                <div
                  key={cat.name}
                  className={`p-2.5 rounded-xl border transition-colors ${
                    isContingency
                      ? 'bg-[#f8f6ee] border-[#dfdbcc]'
                      : 'bg-white border-[#f0ede4] hover:border-[#dfdbcc]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#1f1e1a]">{cat.name}</span>
                      {isContingency ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ebd8c5] text-[#864c24] font-bold">
                          Safety buffer
                        </span>
                      ) : cat.essential ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e8ede7] text-[#2f4335] font-semibold">
                          Essential
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f2efe9] text-[#57554e] font-medium">
                          Flexible
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#57554e] font-mono">
                        {pct.toFixed(0)}%
                      </span>
                      <span className="font-bold text-[#1f1e1a] text-xs font-mono">
                        {formatINR(cat.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_110px] gap-3 items-center">
                    <div
                      role="progressbar"
                      aria-valuenow={Math.round(pct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${cat.name} budget allocation percentage`}
                      className="h-2 bg-[#efede6] rounded-full overflow-hidden"
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isContingency ? 'bg-[#9c4f2b]' : 'bg-[#536d59]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#57554e]">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={cat.amount}
                        onChange={(e) =>
                          onUpdateCategoryAmount(idx, Math.max(0, Number(e.target.value)))
                        }
                        className="w-full h-8 pl-5 pr-2 rounded-lg border border-[#dedbd1] bg-[#fffefa] text-xs font-semibold text-right text-[#1f1e1a] focus:outline-none focus:ring-2 focus:ring-[#354c3c]"
                        aria-label={`${cat.name} allocation in rupees`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-[#dedad0]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[#57554e]">Total planned:</span>
          <div className="text-right">
            <span className="text-base font-bold text-[#1f1e1a] font-mono">
              {formatINR(currentTotal)}
            </span>
          </div>
        </div>

        {!isBalanced && (
          <div
            className={`p-2.5 rounded-xl text-xs mb-3 flex items-start justify-between gap-2 ${
              difference > 0
                ? 'bg-[#fdf3f0] text-[#93371a] border border-[#f4cfc4]'
                : 'bg-[#f4f7f4] text-[#2c5837] border border-[#d2e2d5]'
            }`}
          >
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                {difference > 0 ? (
                  <span>
                    Allocations exceed targeted budget by <strong>{formatINR(difference)}</strong>.
                  </span>
                ) : (
                  <span>
                    <strong>{formatINR(Math.abs(difference))}</strong> unallocated budget available.
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onRebalanceToTotal}
              className="text-[11px] underline font-semibold cursor-pointer shrink-0 hover:opacity-80"
            >
              Rebalance to ₹{plan.budget.toLocaleString('en-IN')}
            </button>
          </div>
        )}

        <p className="text-[11px] text-[#57554e] leading-relaxed flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Starter estimates only. Confirm all prices directly with vendors.</span>
        </p>
      </div>
    </article>
  );
};
