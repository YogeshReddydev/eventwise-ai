import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface BriefSectionProps {
  eventType: string;
  setEventType: (val: string) => void;
  budget: number;
  setBudget: (val: number) => void;
  guests: number;
  setGuests: (val: number) => void;
  days: number;
  setDays: (val: number) => void;
  onBuildPlan: () => void;
  loading: boolean;
}

export const BriefSection: React.FC<BriefSectionProps> = ({
  eventType,
  setEventType,
  budget,
  setBudget,
  guests,
  setGuests,
  days,
  setDays,
  onBuildPlan,
  loading,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onBuildPlan();
  };

  return (
    <section className="bg-white rounded-2xl border border-[#e9e5db] p-6 sm:p-8 mb-8 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#bd7651]">
            Start with the basics
          </span>
          <h2 className="text-xl sm:text-2xl font-serif text-[#24231f]">
            Event brief
          </h2>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-medium text-[#79776f] bg-[#f7f5ef] px-3 py-1.5 rounded-full border border-[#e9e5db]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#bd7651]"></span>
          <span>Starter estimates are customizable</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label htmlFor="eventType" className="block text-xs font-semibold text-[#5d5b53] mb-1.5">
            Event type
          </label>
          <select
            id="eventType"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-[#d8d4c7] bg-white text-sm text-[#24231f] focus:outline-none focus:ring-2 focus:ring-[#405b49] focus:border-[#405b49] transition-all"
          >
            <option value="Wedding">Wedding</option>
            <option value="Birthday">Birthday</option>
            <option value="Community event">Community event</option>
          </select>
        </div>

        <div>
          <label htmlFor="totalBudget" className="block text-xs font-semibold text-[#5d5b53] mb-1.5">
            Total budget (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#79776f] font-semibold">₹</span>
            <input
              id="totalBudget"
              type="number"
              min="1000"
              step="1000"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              required
              className="w-full h-11 pl-8 pr-3.5 rounded-xl border border-[#d8d4c7] bg-white text-sm text-[#24231f] font-medium focus:outline-none focus:ring-2 focus:ring-[#405b49] focus:border-[#405b49] transition-all"
            />
          </div>
        </div>

        <div>
          <label htmlFor="guestCount" className="block text-xs font-semibold text-[#5d5b53] mb-1.5">
            Guest count
          </label>
          <input
            id="guestCount"
            type="number"
            min="1"
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            required
            className="w-full h-11 px-3.5 rounded-xl border border-[#d8d4c7] bg-white text-sm text-[#24231f] font-medium focus:outline-none focus:ring-2 focus:ring-[#405b49] focus:border-[#405b49] transition-all"
          />
        </div>

        <div>
          <label htmlFor="daysToEvent" className="block text-xs font-semibold text-[#5d5b53] mb-1.5">
            Days to event
          </label>
          <div className="flex gap-2">
            <input
              id="daysToEvent"
              type="number"
              min="0"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              required
              className="w-full h-11 px-3.5 rounded-xl border border-[#d8d4c7] bg-white text-sm text-[#24231f] font-medium focus:outline-none focus:ring-2 focus:ring-[#405b49] focus:border-[#405b49] transition-all"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-11 px-4 rounded-xl bg-[#405b49] hover:bg-[#344a3c] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:shadow cursor-pointer shrink-0 disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Build plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};
