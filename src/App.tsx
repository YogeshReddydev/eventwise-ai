import React, { useEffect, useState } from 'react';
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
  const [plan, setPlan] = useState<EventPlan>(() => buildPlan(100000, 150, 60, 'Wedding'));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = async (b = budget, g = guests, d = days, e = eventType) => {
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
    } catch (err: any) {
      console.warn('API error, falling back to local deterministic calculation:', err);
      try {
        const local = buildPlan(b, g, d, e);
        setPlan(local);
      } catch (localErr: any) {
        setError(localErr.message || 'Error creating plan.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan(100000, 150, 60, 'Wedding');
  }, []);

  const handleUpdateCategoryAmount = (index: number, newAmount: number) => {
    setPlan((prev) => {
      const updatedCategories = [...prev.categories];
      updatedCategories[index] = { ...updatedCategories[index], amount: newAmount };
      return {
        ...prev,
        categories: updatedCategories,
      };
    });
  };

  const handleRebalanceToTotal = () => {
    setPlan((prev) => {
      const updated = buildPlan(prev.budget, prev.guests, prev.days_until_event, prev.event_type);
      return {
        ...prev,
        categories: updated.categories,
      };
    });
  };

  const handleAcceptRecovery = (newPlan: EventPlan) => {
    setPlan(newPlan);
    setBudget(newPlan.budget);
    setGuests(newPlan.guests);
  };

  const handleToggleTask = (index: number) => {
    setPlan((prev) => {
      const updatedTasks = [...prev.tasks];
      updatedTasks[index] = {
        ...updatedTasks[index],
        done: !updatedTasks[index].done,
      };
      return { ...prev, tasks: updatedTasks };
    });
  };

  const handleAddTask = (task: PlanningTask) => {
    setPlan((prev) => ({
      ...prev,
      tasks: [task, ...prev.tasks],
    }));
  };

  const handleUpdateVendor = (index: number, updated: Partial<VendorItem>) => {
    setPlan((prev) => {
      const updatedVendors = [...prev.vendors];
      updatedVendors[index] = { ...updatedVendors[index], ...updated };
      return { ...prev, vendors: updatedVendors };
    });
  };

  const handleAddVendor = (vendor: VendorItem) => {
    setPlan((prev) => ({
      ...prev,
      vendors: [...prev.vendors, vendor],
    }));
  };

  const handleDeleteVendor = (index: number) => {
    setPlan((prev) => ({
      ...prev,
      vendors: prev.vendors.filter((_, i) => i !== index),
    }));
  };

  const handleSelectPreset = (b: number, g: number, d: number, e: string) => {
    setBudget(b);
    setGuests(g);
    setDays(d);
    setEventType(e);
    fetchPlan(b, g, d, e);
  };

  const handleReset = () => {
    setBudget(100000);
    setGuests(150);
    setDays(60);
    setEventType('Wedding');
    fetchPlan(100000, 150, 60, 'Wedding');
  };

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#24231f] flex flex-col font-sans selection:bg-[#405b49] selection:text-white">
      <Navbar plan={plan} onSelectPreset={handleSelectPreset} onReset={handleReset} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <HeroSection />

        <BriefSection
          eventType={eventType}
          setEventType={setEventType}
          budget={budget}
          setBudget={setBudget}
          guests={guests}
          setGuests={setGuests}
          days={days}
          setDays={setDays}
          onBuildPlan={() => fetchPlan(budget, guests, days, eventType)}
          loading={loading}
        />

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#fdf3f0] border border-[#f4cfc4] text-[#93371a] text-sm">
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
