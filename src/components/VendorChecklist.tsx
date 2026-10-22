import React, { useMemo, useState } from 'react';
import { Check, Download, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { EventPlan, VendorItem, VendorStatus } from '../types.ts';
import { formatINR } from '../planner.ts';

interface VendorChecklistProps {
  plan: EventPlan;
  onUpdateVendor: (index: number, updated: Partial<VendorItem>) => void;
  onAddVendor: (vendor: VendorItem) => void;
  onDeleteVendor: (index: number) => void;
}

const STATUS_COLORS: Record<VendorStatus, { bg: string; text: string; border: string }> = {
  'Not contacted': { bg: 'bg-[#f4f2ec]', text: 'text-[#6f6b61]', border: 'border-[#dedad0]' },
  'Contacted': { bg: 'bg-[#edf4f9]', text: 'text-[#20577d]', border: 'border-[#d0e0ed]' },
  'Quote received': { bg: 'bg-[#fef6e9]', text: 'text-[#8c5a1a]', border: 'border-[#fae3c3]' },
  'Booked': { bg: 'bg-[#eaf5ed]', text: 'text-[#276639]', border: 'border-[#c6e6cf]' },
  'Paid': { bg: 'bg-[#405b49]', text: 'text-white', border: 'border-[#405b49]' },
};

export const VendorChecklist: React.FC<VendorChecklistProps> = ({
  plan,
  onUpdateVendor,
  onAddVendor,
  onDeleteVendor,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newCategory, setNewCategory] = useState('Decorations');
  const [newVendorName, setNewVendorName] = useState('');
  const [newQuote, setNewQuote] = useState(10000);

  const totalCommitted = useMemo(
    () => plan.vendors.reduce((sum, v) => sum + (v.quote || 0), 0),
    [plan.vendors]
  );

  const bookedCount = useMemo(
    () => plan.vendors.filter((v) => v.status === 'Booked' || v.status === 'Paid').length,
    [plan.vendors]
  );

  const filteredVendors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return plan.vendors
      .map((v, originalIdx) => ({ v, originalIdx }))
      .filter(({ v }) => {
        if (!q) return true;
        return (
          v.category.toLowerCase().includes(q) ||
          (v.vendor && v.vendor.toLowerCase().includes(q))
        );
      });
  }, [plan.vendors, searchQuery]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddVendor({
      category: newCategory,
      vendor: newVendorName.trim() || 'Pending vendor',
      quote: newQuote,
      status: 'Contacted',
    });
    setNewVendorName('');
    setShowAddForm(false);
  };

  const handleExportCSV = () => {
    const headers = ['Category', 'Vendor / Contact', 'Quote (INR)', 'Status'];
    const escapeCsv = (str: string | number) => {
      const s = String(str ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const vendorsToExport = searchQuery.trim()
      ? filteredVendors.map((item) => item.v)
      : plan.vendors;

    const rows = vendorsToExport.map((v) => [
      escapeCsv(v.category),
      escapeCsv(v.vendor || 'Unassigned'),
      escapeCsv(v.quote),
      escapeCsv(v.status),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eventwise-vendors-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-white rounded-2xl border border-[#dedad0] p-6 sm:p-8 mb-8 shadow-xs" aria-labelledby="vendor-checklist-heading">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9c4f2b]">
            People who make it happen
          </span>
          <h2 id="vendor-checklist-heading" className="text-xl sm:text-2xl font-serif text-[#1f1e1a]">Vendor checklist</h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-xs text-[#57554e] hidden md:block">
            <span className="font-semibold text-[#1f1e1a]">{bookedCount}</span> of{' '}
            <span className="font-semibold text-[#1f1e1a]">{plan.vendors.length}</span> confirmed
          </div>
          <button
            onClick={handleExportCSV}
            title={searchQuery.trim() ? "Export filtered vendors as CSV file" : "Export vendor table as CSV file"}
            aria-label="Export vendor table as CSV file"
            className="button secondary"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            aria-expanded={showAddForm}
            aria-controls="add-vendor-form"
            className="button primary"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add vendor</span>
          </button>
        </div>
      </div>

      {/* Search Input Field */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#57554e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendors by name or category..."
            className="w-full h-9 pl-9 pr-8 rounded-xl border border-[#dedbd1] bg-[#faf8f2] text-xs text-[#1f1e1a] placeholder:text-[#57554e] focus:outline-none focus:ring-2 focus:ring-[#354c3c] focus:bg-white transition-all"
            aria-label="Filter vendors by name or category"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#57554e] hover:text-[#1f1e1a] p-0.5 rounded cursor-pointer"
              aria-label="Clear vendor search filter"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {searchQuery.trim() && (
          <div className="text-xs text-[#57554e]" role="status" aria-live="polite">
            Showing <strong>{filteredVendors.length}</strong> of {plan.vendors.length} vendors
          </div>
        )}
      </div>

      {showAddForm && (
        <form id="add-vendor-form" onSubmit={handleAddSubmit} className="mb-6 p-4 rounded-xl bg-[#faf8f2] border border-[#e8e4d8] grid grid-cols-1 sm:grid-cols-4 gap-3 items-end animate-fadeIn">
          <div>
            <label htmlFor="newVendorCategoryInput" className="block text-xs font-semibold text-[#1f1e1a] mb-1">Category</label>
            <input
              id="newVendorCategoryInput"
              type="text"
              required
              placeholder="e.g. DJ & Sound"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-[#dedad0] bg-white text-xs text-[#1f1e1a] focus:outline-none focus:ring-2 focus:ring-[#354c3c]"
            />
          </div>
          <div>
            <label htmlFor="newVendorNameInput" className="block text-xs font-semibold text-[#1f1e1a] mb-1">Vendor / contact name</label>
            <input
              id="newVendorNameInput"
              type="text"
              placeholder="e.g. Rhythm Beats Studio"
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-[#dedad0] bg-white text-xs text-[#1f1e1a] focus:outline-none focus:ring-2 focus:ring-[#354c3c]"
            />
          </div>
          <div>
            <label htmlFor="newVendorQuoteInput" className="block text-xs font-semibold text-[#1f1e1a] mb-1">Quote (₹)</label>
            <input
              id="newVendorQuoteInput"
              type="number"
              min="0"
              step="500"
              value={newQuote}
              onChange={(e) => setNewQuote(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-lg border border-[#dedad0] bg-white text-xs text-[#1f1e1a] focus:outline-none focus:ring-2 focus:ring-[#354c3c]"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 h-9 rounded-lg bg-[#354c3c] text-white text-xs font-semibold transition-colors hover:bg-[#28392e] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#9c4f2b]"
            >
              Save vendor
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 h-9 rounded-lg bg-white border border-[#dedad0] text-xs font-semibold text-[#57554e] hover:text-[#1f1e1a] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#354c3c]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Responsive Table with Full ARIA Semantics */}
      <div className="overflow-x-auto border border-[#efede6] rounded-xl">
        <table className="w-full text-left text-xs border-collapse" aria-label="Vendor quotations and booking status">
          <thead>
            <tr className="bg-[#f9f8f4] border-b border-[#e9e5db] text-[#57554e] font-semibold text-[11px]">
              <th scope="col" className="py-3 px-4">Category</th>
              <th scope="col" className="py-3 px-4">Vendor / contact</th>
              <th scope="col" className="py-3 px-4 w-36">Quote (₹)</th>
              <th scope="col" className="py-3 px-4 w-44">Status</th>
              <th scope="col" className="py-3 px-2 w-10 text-center"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f2efe9]">
            {filteredVendors.map(({ v, originalIdx }) => (
              <tr key={originalIdx} className="hover:bg-[#fcfbf7] transition-colors">
                <td className="py-2.5 px-4 font-semibold text-[#1f1e1a] whitespace-nowrap">
                  {v.category}
                </td>
                <td className="py-2.5 px-4">
                  <input
                    type="text"
                    value={v.vendor}
                    placeholder="Enter vendor name or phone"
                    aria-label={`Vendor name for ${v.category}`}
                    onChange={(e) => onUpdateVendor(originalIdx, { vendor: e.target.value })}
                    className="w-full h-8 px-2.5 rounded-lg border border-[#dedad0] bg-[#fffefa] text-xs text-[#1f1e1a] focus:outline-none focus:ring-1 focus:ring-[#354c3c]"
                  />
                </td>
                <td className="py-2.5 px-4">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#57554e]" aria-hidden="true">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={v.quote}
                      aria-label={`Quote amount in rupees for ${v.category}`}
                      onChange={(e) => onUpdateVendor(originalIdx, { quote: Math.max(0, Number(e.target.value)) })}
                      className="w-full h-8 pl-6 pr-2 rounded-lg border border-[#dedad0] bg-[#fffefa] text-xs font-semibold text-right text-[#1f1e1a] focus:outline-none focus:ring-1 focus:ring-[#354c3c]"
                    />
                  </div>
                </td>
                <td className="py-2.5 px-4">
                  <select
                    value={v.status}
                    aria-label={`Booking status for ${v.category}`}
                    onChange={(e) => onUpdateVendor(originalIdx, { status: e.target.value as VendorStatus })}
                    className={`h-8 px-2.5 rounded-lg text-xs font-semibold border ${
                      STATUS_COLORS[v.status]?.border || 'border-[#dedad0]'
                    } ${STATUS_COLORS[v.status]?.bg || 'bg-white'} ${
                      STATUS_COLORS[v.status]?.text || 'text-[#1f1e1a]'
                    } focus:outline-none focus:ring-1 focus:ring-[#354c3c] cursor-pointer`}
                  >
                    <option value="Not contacted">Not contacted</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Quote received">Quote received</option>
                    <option value="Booked">Booked</option>
                    <option value="Paid">Paid</option>
                  </select>
                </td>
                <td className="py-2.5 px-2 text-center">
                  {plan.vendors.length > 1 && (
                    <button
                      onClick={() => onDeleteVendor(originalIdx)}
                      title={`Remove vendor row for ${v.category}`}
                      aria-label={`Remove vendor row for ${v.category}`}
                      className="p-1 text-[#57554e] hover:text-[#b43924] rounded transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#9c4f2b]"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {filteredVendors.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-[#57554e]">
                  No vendors found matching "{searchQuery}".{' '}
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[#354c3c] font-semibold underline ml-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#9c4f2b]"
                  >
                    Clear filter
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#79776f]">
        <p className="text-[11px] text-[#969187]">
          No vendors are pre-verified or booked by this demo. Enter real details after confirming them.
        </p>
        <div className="font-semibold text-[#24231f]">
          Total vendor quotes: <span className="font-mono">{formatINR(totalCommitted)}</span>
        </div>
      </div>
    </section>
  );
};
