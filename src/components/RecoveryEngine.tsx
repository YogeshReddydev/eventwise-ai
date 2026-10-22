import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, Check, Sparkles, TrendingDown, TrendingUp, Undo2 } from 'lucide-react';
import { EventPlan } from '../types.ts';
import { formatINR } from '../planner.ts';

interface RecoveryEngineProps {
  plan: EventPlan;
  onAcceptRecovery: (newPlan: EventPlan) => void;
}

export const RecoveryEngine: React.FC<RecoveryEngineProps> = ({ plan, onAcceptRecovery }) => {
  const [changeType, setChangeType] = useState<'vendor_increase' | 'budget' | 'guests'>('vendor_increase');
  const [changeValue, setChangeValue] = useState<number>(12000);
  const [selectedCategory, setSelectedCategory] = useState<string>('Catering');
  const [proposal, setProposal] = useState<EventPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const eligibleCategories = plan.categories.filter((c) => c.name !== 'Contingency');

  const handleTypeChange = (newType: 'vendor_increase' | 'budget' | 'guests') => {
    setChangeType(newType);
    setProposal(null);
    setError(null);
    setSuccessMessage(null);
    if (newType === 'budget') {
      setChangeValue(plan.budget > 20000 ? plan.budget - 20000 : plan.budget);
    } else if (newType === 'guests') {
      setChangeValue(plan.guests + 30);
    } else {
      setChangeValue(12000);
    }
  };

  const handleCalculateRecovery = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          change_type: changeType,
          value: changeValue,
          category: changeType === 'vendor_increase' ? selectedCategory : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to calculate recovery proposal.');
      }
      setProposal(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred while contacting recovery engine.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (!proposal) return;
    onAcceptRecovery(proposal);
    setSuccessMessage('Recovery plan accepted! Your active plan and allocations have been updated.');
    setProposal(null);
  };

  return (
    <article className="bg-[#fffefa] rounded-2xl border border-[#e9e5db] p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#bd7651]">
              When plans change
            </span>
            <h2 className="text-xl font-serif text-[#24231f]">Plan Recovery Engine</h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#fbf1ea] text-[#bd7651] font-semibold border border-[#f4dfd4]">
            Adaptive safety
          </span>
        </div>

        <p className="text-xs text-[#79776f] mb-5 leading-relaxed">
          Try a real-world scenario. EventWise proposes a rebalanced plan without automatically approving or committing your funds.
        </p>

        {/* Quick Scenario Shortcuts */}
        <div className="mb-4">
          <span className="text-[11px] font-semibold text-[#5d5b53] block mb-1.5">Try a common scenario:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                handleTypeChange('vendor_increase');
                setSelectedCategory('Catering');
                setChangeValue(12000);
              }}
              className="text-xs px-2.5 py-1 rounded-lg bg-[#f7f5ef] border border-[#e2ded2] text-[#24231f] hover:bg-[#ede9dc] transition-colors cursor-pointer"
            >
              +₹12k Catering hike
            </button>
            <button
              type="button"
              onClick={() => {
                handleTypeChange('budget');
                setChangeValue(80000);
              }}
              className="text-xs px-2.5 py-1 rounded-lg bg-[#f7f5ef] border border-[#e2ded2] text-[#24231f] hover:bg-[#ede9dc] transition-colors cursor-pointer"
            >
              Budget cut to ₹80,000
            </button>
            <button
              type="button"
              onClick={() => {
                handleTypeChange('guests');
                setChangeValue(180);
              }}
              className="text-xs px-2.5 py-1 rounded-lg bg-[#f7f5ef] border border-[#e2ded2] text-[#24231f] hover:bg-[#ede9dc] transition-colors cursor-pointer"
            >
              +30 guests (180 total)
            </button>
          </div>
        </div>

        {/* Change Configuration Form */}
        <div className="space-y-3.5 mb-5 bg-[#faf8f2] p-4 rounded-xl border border-[#ece8dc]">
          <div>
            <label className="block text-xs font-semibold text-[#5d5b53] mb-1">
              What changed in your event?
            </label>
            <select
              value={changeType}
              onChange={(e) => handleTypeChange(e.target.value as any)}
              className="w-full h-10 px-3 rounded-lg border border-[#dedbd1] bg-white text-xs font-medium text-[#24231f] focus:outline-none focus:ring-2 focus:ring-[#405b49]"
            >
              <option value="vendor_increase">A vendor raised their quote</option>
              <option value="budget">My total budget changed</option>
              <option value="guests">Guest count changed</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5d5b53] mb-1">
                {changeType === 'budget'
                  ? 'New total budget (₹)'
                  : changeType === 'guests'
                  ? 'New guest count'
                  : 'Quote increase (₹)'}
              </label>
              <div className="relative">
                {changeType !== 'guests' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#79776f]">₹</span>
                )}
                <input
                  type="number"
                  min="1"
                  step={changeType === 'guests' ? '1' : '500'}
                  value={changeValue}
                  onChange={(e) => setChangeValue(Number(e.target.value))}
                  className={`w-full h-10 ${
                    changeType !== 'guests' ? 'pl-7' : 'pl-3'
                  } pr-3 rounded-lg border border-[#dedbd1] bg-white text-xs font-semibold text-[#24231f] focus:outline-none focus:ring-2 focus:ring-[#405b49]`}
                />
              </div>
            </div>

            {changeType === 'vendor_increase' && (
              <div>
                <label className="block text-xs font-semibold text-[#5d5b53] mb-1">
                  Which category?
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#dedbd1] bg-white text-xs font-medium text-[#24231f] focus:outline-none focus:ring-2 focus:ring-[#405b49]"
                >
                  {eligibleCategories.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} (Current: {formatINR(c.amount)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleCalculateRecovery}
            disabled={loading}
            className="w-full h-10 rounded-lg bg-[#405b49] hover:bg-[#344a3c] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Find a recovery plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[#fdf3f0] border border-[#f4cfc4] text-[#93371a] text-xs flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-[#f4f7f4] border border-[#d2e2d5] text-[#2c5837] text-xs flex items-center gap-2 mb-4">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Proposed Recovery Plan Result */}
        {proposal && (
          <div className="p-4 rounded-xl bg-[#f5f3eb] border border-[#dedad0] space-y-3.5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#e5e1d4] pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#82532e]">
                <AlertTriangle className="w-4 h-4" />
                <span>Proposed plan · approval required</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#e8e2d4] text-[#5e584b] font-medium">
                Preview only
              </span>
            </div>

            {proposal.recovery_notes && proposal.recovery_notes.length > 0 && (
              <ul className="text-xs text-[#4c4840] space-y-1.5 pl-4 list-disc leading-relaxed">
                {proposal.recovery_notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#e5e1d4] text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-[#e8e4d8]">
                <span className="text-[11px] text-[#79776f] block">Proposed Budget</span>
                <span className="text-sm font-bold text-[#24231f]">{formatINR(proposal.budget)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-[#e8e4d8]">
                <span className="text-[11px] text-[#79776f] block">Per Guest</span>
                <span className="text-sm font-bold text-[#24231f]">
                  {formatINR(proposal.per_guest_budget)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#79776f] leading-tight">
              Review the updated figures. This proposed adjustment will only replace your active plan once accepted.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleAccept}
                className="flex-1 h-9 rounded-lg bg-[#405b49] hover:bg-[#324838] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept proposed plan</span>
              </button>
              <button
                type="button"
                onClick={() => setProposal(null)}
                className="px-3 h-9 rounded-lg bg-white border border-[#dedad0] text-[#5d5b53] hover:text-[#24231f] text-xs font-semibold transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-[#e9e5db] text-[11px] text-[#969187]">
        Contingency buffer protects essential services first before adjusting other categories.
      </div>
    </article>
  );
};
