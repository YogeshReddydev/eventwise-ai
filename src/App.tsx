import React, { useCallback, useState } from 'react';
import { EventPlan, PlanningTask, VendorItem } from './types.ts';
import { buildPlan } from './planner.ts';
import { Navbar } from './components/Navbar.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { BriefSection } from './components/BriefSection.tsx';
import { MetricsOverview } from './components/MetricsOverview.tsx';
import { BudgetBreakdown } from './components/BudgetBreakdown.tsx';
import { RecoveryEngine } from './components/RecoveryEngine.tsx';
import { TimelineSection } from './components/TimelineSection.tsx';
import { VendorChecklist } from './components/VendorChecklist.tsx';
import { AssistantSection } from './components/AssistantSection.tsx';
import { Footer } from './components/Footer.tsx';

export default function App() {
  const [eventType, setEventType] = useState<string>('Wedding');
  const [budget, setBudget] = useState<number>(100000);
  const [guests, setGuests] = useState<number>(150);
  const [days, setDays] = useState<number>(60);
  // Deterministic starter plan initialized directly without redundant initial HTTP request
  const [plan, setPlan] = useState<EventPlan>(() => buildPlan(100000, 150, 60, 'Wedding'));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = useCallback(async (b: number, g: number, d: number, e: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/plan?budget=${encodeURIComponent(b)}&guests=${encodeURIComponent(g)}&days=${encodeURIComponent(
          d
        )}&event_type=${encodeURIComponent(e)}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch plan.');
      }
      const data: EventPlan = await res.json();
      setPlan(data);
      setBudget(b);
      setGuests(g);
      setDays(d);
      setEventType(e);
    } catch (err: unknown) {
      console.warn('Network request failed, calculating deterministically locally');
      try {
        const local = buildPlan(b, g, d, e);
        setPlan(local);
        setBudget(b);
        setGuests(g);
        setDays(d);
        setEventType(e);
      } catch (localErr: unknown) {
        const message = localErr instanceof Error ? localErr.message : 'Error creating plan.';
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpdateCategoryAmount = useCallback((index: number, newAmount: number) => {
    setPlan((prev) => {
      const updatedCategories = [...prev.categories];
      updatedCategories[index] = { ...updatedCategories[index], amount: newAmount };
      return {
        ...prev,
        categories: updatedCategories,
      };
    });
  }, []);

  const handleRebalanceToTotal = useCallback(() => {
    setPlan((prev) => {
      const updated = buildPlan(prev.budget, prev.guests, prev.days_until_event, prev.event_type);
      return {
        ...prev,
        categories: updated.categories,
      };
    });
  }, []);

  const handleAcceptRecovery = useCallback((newPlan: EventPlan) => {
    setPlan(newPlan);
    setBudget(newPlan.budget);
    setGuests(newPlan.guests);
  }, []);

  const handleToggleTask = useCallback((index: number) => {
    setPlan((prev) => {
      const updatedTasks = [...prev.tasks];
      updatedTasks[index] = {
        ...updatedTasks[index],
        done: !updatedTasks[index].done,
      };
      return { ...prev, tasks: updatedTasks };
    });
  }, []);

  const handleAddTask = useCallback((task: PlanningTask) => {
    setPlan((prev) => ({
      ...prev,
      tasks: [task, ...prev.tasks],
    }));
  }, []);

  const handleUpdateVendor = useCallback((index: number, updated: Partial<VendorItem>) => {
    setPlan((prev) => {
      const updatedVendors = [...prev.vendors];
      updatedVendors[index] = { ...updatedVendors[index], ...updated };
      return { ...prev, vendors: updatedVendors };
    });
  }, []);

  const handleAddVendor = useCallback((vendor: VendorItem) => {
    setPlan((prev) => ({
      ...prev,
      vendors: [...prev.vendors, vendor],
    }));
  }, []);

  const handleDeleteVendor = useCallback((index: number) => {
    setPlan((prev) => ({
      ...prev,
      vendors: prev.vendors.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSelectPreset = useCallback((b: number, g: number, d: number, e: string) => {
    fetchPlan(b, g, d, e);
  }, [fetchPlan]);

  const handleReset = useCallback(() => {
    fetchPlan(100000, 150, 60, 'Wedding');
  }, [fetchPlan]);

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#1f1e1a] flex flex-col font-sans selection:bg-[#354c3c] selection:text-white">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#354c3c] focus:text-white focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#9c4f2b]"
      >
        Skip to main content
      </a>

      <Navbar plan={plan} onSelectPreset={handleSelectPreset} onReset={handleReset} />

      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8" tabIndex={-1}>
        <HeroSection />

        <BriefSection
          initialEventType={eventType}
          initialBudget={budget}
          initialGuests={guests}
          initialDays={days}
          onBuildPlan={(b, g, d, e) => fetchPlan(b, g, d, e)}
          loading={loading}
        />

        {error && (
          <div role="alert" className="mb-6 p-4 rounded-xl bg-[#fdf3f0] border border-[#f4cfc4] text-[#93371a] text-sm">
            {error}
          </div>
        )}

        <MetricsOverview plan={plan} />

        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6 mb-8">
          <BudgetBreakdown
            plan={plan}
            onUpdateCategoryAmount={handleUpdateCategoryAmount}
            onRebalanceToTotal={handleRebalanceToTotal}
          />
          <RecoveryEngine plan={plan} onAcceptRecovery={handleAcceptRecovery} />
        </div>

        <TimelineSection
          plan={plan}
          onToggleTask={handleToggleTask}
          onAddTask={handleAddTask}
        />

        <VendorChecklist
          plan={plan}
          onUpdateVendor={handleUpdateVendor}
          onAddVendor={handleAddVendor}
          onDeleteVendor={handleDeleteVendor}
        />

        <AssistantSection plan={plan} />

        <Footer />
      </main>
    </div>
  );
}
