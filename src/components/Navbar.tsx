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
    <header className="h-[72px] bg-[#fbfaf6] border-b border-[#dedad0] px-4 md:px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <a href="/" className="flex items-center gap-2.5 text-[#1f1e1a] font-bold text-lg tracking-tight no-underline group focus:outline-none focus:ring-2 focus:ring-[#354c3c] rounded-xl p-1">
          <span className="w-8 h-8 rounded-xl bg-[#354c3c] text-white flex items-center justify-center font-serif text-xl shadow-xs group-hover:scale-105 transition-transform" aria-hidden="true">
            E
          </span>
          <span className="flex items-center gap-1 font-sans">
            <span>EventWise</span>
            <span className="text-[#354c3c] font-black">AI</span>
          </span>
        </a>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e9eee8] text-[#354c3c] text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#354c3c] animate-pulse" aria-hidden="true"></span>
          <span>Smart planning workspace</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <nav aria-label="Preset plan configurations" className="hidden md:flex items-center gap-1.5 bg-[#f0eee7] p-1 rounded-lg text-xs font-medium">
          <span className="text-[#57554e] px-2 text-[11px]">Presets:</span>
          <button
            type="button"
            onClick={() => onSelectPreset(100000, 150, 60, 'Wedding')}
            className="px-2.5 py-1 rounded bg-white text-[#1f1e1a] hover:text-[#354c3c] shadow-2xs hover:bg-[#faf9f5] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#354c3c]"
          >
            Wedding ₹1L
          </button>
          <button
            type="button"
            onClick={() => onSelectPreset(35000, 40, 20, 'Birthday')}
            className="px-2.5 py-1 rounded bg-white text-[#1f1e1a] hover:text-[#354c3c] shadow-2xs hover:bg-[#faf9f5] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#354c3c]"
          >
            Birthday ₹35k
          </button>
          <button
            type="button"
            onClick={() => onSelectPreset(150000, 200, 45, 'Community event')}
            className="px-2.5 py-1 rounded bg-white text-[#1f1e1a] hover:text-[#354c3c] shadow-2xs hover:bg-[#faf9f5] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#354c3c]"
          >
            Community ₹1.5L
          </button>
        </nav>

        <button
          type="button"
          onClick={handlePrint}
          title="Print or save as PDF"
          aria-label="Print or save event plan as PDF"
          className="p-2 text-[#57554e] hover:text-[#1f1e1a] hover:bg-[#eeece3] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#354c3c]"
        >
          <Printer className="w-4 h-4" aria-hidden="true" />
          <span className="hidden lg:inline">Print</span>
        </button>

        <button
          type="button"
          onClick={handleExportJSON}
          title="Export plan as JSON file"
          aria-label="Export event plan as JSON file"
          className="p-2 text-[#57554e] hover:text-[#1f1e1a] hover:bg-[#eeece3] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#354c3c]"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          <span className="hidden lg:inline">Export</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          title="Reset to default ₹1,00,000 Wedding plan"
          aria-label="Reset to default ₹1,00,000 Wedding plan"
          className="p-2 text-[#57554e] hover:text-[#1f1e1a] hover:bg-[#eeece3] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#354c3c]"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </header>
  );
};
