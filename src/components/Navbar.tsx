import React from 'react';
import { Calendar, CheckCircle2, DollarSign, Download, Printer, RefreshCw, Sparkles, Users } from 'lucide-react';
import { EventPlan } from '../types.ts';
import { formatINR } from '../planner.ts';

interface NavbarProps {
  plan: EventPlan | null;
  onSelectPreset: (budget: number, guests: number, days: number, eventType: string) => void;
  onReset: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ plan, onSelectPreset, onReset }) => {
  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    if (!plan) return;
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eventwise-plan-${plan.event_type.toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="h-[72px] bg-[#fbfaf6] border-b border-[#e9e5db] px-4 md:px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <a href="/" className="flex items-center gap-2.5 text-[#24231f] font-bold text-lg tracking-tight no-underline group">
          <span className="w-8 h-8 rounded-xl bg-[#405b49] text-white flex items-center justify-center font-serif text-xl shadow-xs group-hover:scale-105 transition-transform">
            E
          </span>
          <span className="flex items-center gap-1 font-sans">
            <span>EventWise</span>
            <span className="text-[#405b49] font-black">AI</span>
          </span>
        </a>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e9eee8] text-[#405b49] text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#64886d] animate-pulse"></span>
          <span>Smart planning workspace</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1.5 bg-[#f0eee7] p-1 rounded-lg text-xs font-medium">
          <span className="text-[#79776f] px-2 text-[11px]">Presets:</span>
          <button
            onClick={() => onSelectPreset(100000, 150, 60, 'Wedding')}
            className="px-2.5 py-1 rounded bg-white text-[#24231f] hover:text-[#405b49] shadow-2xs hover:bg-[#faf9f5] transition-colors cursor-pointer"
          >
            Wedding ₹1L
          </button>
          <button
            onClick={() => onSelectPreset(35000, 40, 20, 'Birthday')}
            className="px-2.5 py-1 rounded bg-white text-[#24231f] hover:text-[#405b49] shadow-2xs hover:bg-[#faf9f5] transition-colors cursor-pointer"
          >
            Birthday ₹35k
          </button>
          <button
            onClick={() => onSelectPreset(150000, 200, 45, 'Community event')}
            className="px-2.5 py-1 rounded bg-white text-[#24231f] hover:text-[#405b49] shadow-2xs hover:bg-[#faf9f5] transition-colors cursor-pointer"
          >
            Community ₹1.5L
          </button>
        </div>

        <button
          onClick={handlePrint}
          title="Print or save as PDF"
          className="p-2 text-[#5d5b53] hover:text-[#24231f] hover:bg-[#eeece3] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden lg:inline">Print</span>
        </button>

        <button
          onClick={handleExportJSON}
          title="Export plan as JSON file"
          className="p-2 text-[#5d5b53] hover:text-[#24231f] hover:bg-[#eeece3] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          <Download className="w-4 h-4" />
          <span className="hidden lg:inline">Export</span>
        </button>

        <button
          onClick={onReset}
          title="Reset to default ₹1,00,000 Wedding plan"
          className="p-2 text-[#5d5b53] hover:text-[#24231f] hover:bg-[#eeece3] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </header>
  );
};
