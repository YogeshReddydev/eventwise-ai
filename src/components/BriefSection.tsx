import React, { useEffect, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface BriefSectionProps {
  initialEventType: string;
  initialBudget: number;
  initialGuests: number;
  initialDays: number;
  onBuildPlan: (budget: number, guests: number, days: number, eventType: string) => void;
  loading: boolean;
}

export const BriefSection: React.FC<BriefSectionProps> = ({
  initialEventType,
  initialBudget,
  initialGuests,
  initialDays,
  onBuildPlan,
  loading,
}) => {
  const [eventType, setEventType] = useState(initialEventType);
  const [budget, setBudget] = useState(initialBudget);
  const [guests, setGuests] = useState(initialGuests);
  const [days, setDays] = useState(initialDays);

  // Sync with parent when presets or resets update
  useEffect(() => {
    setEventType(initialEventType);
  }, [initialEventType]);

  useEffect(() => {
    setBudget(initialBudget);
  }, [initialBudget]);

  useEffect(() => {
    setGuests(initialGuests);
  }, [initialGuests]);

  useEffect(() => {
    setDays(initialDays);
  }, [initialDays]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onBuildPlan(budget, guests, days, eventType);
  };

  return (
    <section className="bg-white rounded-2xl border border-[#dedad0] p-6 sm:p-8 mb-8 shadow-xs" aria-labelledby="brief-heading">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9c4f2b]">
            Start with the basics
          </span>
          <h2 id="brief-heading" className="text-xl sm:text-2xl font-serif text-[#1f1e1a]">
            Event brief
          </h2>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold text-[#57554e] bg-[#f7f5ef] px-3 py-1.5 rounded-full border border-[#dedad0]">
          <span className="w-2 h-2 rounded-full bg-[#9c4f2b]" aria-hidden="true"></span>
          <span>Starter estimates are customizable</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" noValidate={false}>
        <div>
          <label htmlFor="eventTypeSelect" className="block text-xs font-bold text-[#1f1e1a] mb-1.5">
            Event type
          </label>
          <select
            id="eventTypeSelect"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-[#dedad0] bg-[#fffefa] text-xs font-medium text-[#1f1e1a] focus:outline-none focus:ring-2 focus:ring-[#354c3c] transition-all cursor-pointer"
          >
            <option value="Wedding">Wedding</option>
            <option value="Birthday">Birthday</option>
            <option value="Community event">Community event</option>
          </select>
        </div>

        <div>
          <label htmlFor="totalBudgetInput" className="block text-xs font-bold text-[#1f1e1a] mb-1.5">
            Total budget (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#57554e] font-semibold" aria-hidden="true">₹</span>
            <input
              id="totalBudgetInput"
              type="number"
              min="1000"
              max="1000000000"
              step="1000"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              required
              aria-label="Total event budget in rupees"
              className="w-full h-11 pl-8 pr-3.5 rounded-xl border border-[#dedad0] bg-[#fffefa] text-xs font-semibold text-[#1f1e1a] focus:outline-none focus:ring-2 focus:ring-[#354c3c] transition-all"
            />
          </div>
        </div>

        <div>
          <label htmlFor="guestCountInput" className="block text-xs font-bold text-[#1f1e1a] mb-1.5">
            Guest count
          </label>
          <input
            id="guestCountInput"
            type="number"
            min="1"
            max="1000000"
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            required
            aria-label="Expected number of guests"
            className="w-full h-11 px-3.5 rounded-xl border border-[#dedad0] bg-[#fffefa] text-xs font-semibold text-[#1f1e1a] focus:outline-none focus:ring-2 focus:ring-[#354c3c] transition-all"
          />
        </div>

        <div>
          <label htmlFor="daysToEventInput" className="block text-xs font-bold text-[#1f1e1a] mb-1.5">
            Days to event
          </label>
          <div className="flex gap-2">
            <input
              id="daysToEventInput"
              type="number"
              min="0"
              max="3650"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              required
              aria-label="Number of days remaining until the event"
              className="w-full h-11 px-3.5 rounded-xl border border-[#dedad0] bg-[#fffefa] text-xs font-semibold text-[#1f1e1a] focus:outline-none focus:ring-2 focus:ring-[#354c3c] transition-all"
            />
            <button
              type="submit"
              disabled={loading}
              className="button primary h-11 shrink-0"
              aria-label="Build customized plan"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-label="Loading"></span>
              ) : (
                <>
                  <span>Build plan</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};
