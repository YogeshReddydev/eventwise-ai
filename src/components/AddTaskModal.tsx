import React, { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { PlanningTask, Priority } from '../types.ts';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: PlanningTask) => void;
  categories?: string[];
  daysUntilEvent?: number;
}

const DEFAULT_CATEGORIES = [
  'General Logistics',
  'Venue',
  'Catering',
  'Decorations',
  'Photography',
  'Clothing & makeup',
  'Transport',
  'Invitations & gifts',
  'Music & Entertainment',
];

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  categories = DEFAULT_CATEGORIES,
  daysUntilEvent = 60,
}) => {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = React.useRef<HTMLElement | null>(null);

  const [taskName, setTaskName] = useState('');
  const [category, setCategory] = useState(categories[0] || 'General Logistics');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + Math.min(14, Math.max(1, daysUntilEvent - 5)));
    return d.toISOString().split('T')[0];
  });
  const [priority, setPriority] = useState<Priority>('High');
  const [error, setError] = useState<string | null>(null);

  // Focus trap and keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element for restoration
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    // Focus first input inside dialog
    const timer = setTimeout(() => {
      const firstInput = modalRef.current?.querySelector<HTMLInputElement | HTMLButtonElement>(
        'input, select, textarea, button:not([disabled])'
      );
      firstInput?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus to trigger element
      previouslyFocusedElement.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = taskName.trim();
    if (!trimmedTitle) {
      setError('Task name is required.');
      return;
    }
    if (!dueDate) {
      setError('Please select a target due date.');
      return;
    }

    const finalCategory = isCustomCategory ? customCategory.trim() || 'General' : category;

    onAddTask({
      title: trimmedTitle,
      category: finalCategory,
      due_date: dueDate,
      priority,
      done: false,
    });

    // Reset form
    setTaskName('');
    setError(null);
    onClose();
  };

  const handleQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setDueDate(d.toISOString().split('T')[0]);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#dedad0] relative animate-scaleUp overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#f0eee8] mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#e9eee8] text-[#354c3c] flex items-center justify-center font-semibold text-sm" aria-hidden="true">
              <CheckCircle2 className="w-4 h-4 text-[#354c3c]" />
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9c4f2b]">
                Task Management
              </span>
              <h3 id="modal-title" className="text-xl font-serif text-[#1f1e1a]">
                Add planning milestone
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#57554e] hover:text-[#1f1e1a] hover:bg-[#f7f5ef] rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#354c3c]"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 p-2.5 rounded-xl bg-[#fdf3f0] border border-[#f4cfc4] text-[#93371a] text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field 1: Task Name */}
          <div>
            <label htmlFor="taskNameInput" className="block text-xs font-semibold text-[#1f1e1a] mb-1.5">
              Task name <span className="text-[#9c4f2b]">*</span>
            </label>
            <input
              id="taskNameInput"
              type="text"
              required
              autoFocus
              value={taskName}
              onChange={(e) => {
                setTaskName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Schedule final cake tasting & dessert selection"
              className="w-full h-11 px-3.5 rounded-xl border border-[#dedad0] bg-[#fffefa] text-xs font-medium text-[#1f1e1a] placeholder:text-[#57554e] focus:outline-none focus:ring-2 focus:ring-[#354c3c] focus:border-[#354c3c] transition-all"
            />
          </div>

          {/* Field 2: Category */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="taskCategorySelect" className="block text-xs font-semibold text-[#1f1e1a]">
                Event category <span className="text-[#9c4f2b]">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomCategory(!isCustomCategory)}
                className="text-[11px] font-semibold text-[#354c3c] hover:underline cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#9c4f2b] rounded px-1"
              >
                {isCustomCategory ? 'Choose from list' : '+ Custom category'}
              </button>
            </div>

            {isCustomCategory ? (
              <input
                id="customCategoryInput"
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category name (e.g. Guest Favors)"
                aria-label="Custom category name"
                className="w-full h-11 px-3.5 rounded-xl border border-[#dedad0] bg-[#fffefa] text-xs font-medium text-[#1f1e1a] focus:outline-none focus:ring-2 focus:ring-[#354c3c] focus:border-[#354c3c] transition-all"
              />
            ) : (
              <select
                id="taskCategorySelect"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#dedad0] bg-[#fffefa] text-xs font-medium text-[#1f1e1a] focus:outline-none focus:ring-2 focus:ring-[#354c3c] focus:border-[#354c3c] transition-all cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Field 3: Target Due Date & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="taskDueDateInput" className="block text-xs font-semibold text-[#1f1e1a] mb-1.5">
                Target due date <span className="text-[#9c4f2b]">*</span>
              </label>
              <div className="relative">
                <input
                  id="taskDueDateInput"
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#dedad0] bg-[#fffefa] text-xs font-medium text-[#1f1e1a] focus:outline-none focus:ring-2 focus:ring-[#354c3c] focus:border-[#354c3c] transition-all"
                />
              </div>

              {/* Quick Date Presets */}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[10px] text-[#57554e]">Quick:</span>
                <button
                  type="button"
                  onClick={() => handleQuickDate(7)}
                  className="text-[10px] px-2 py-0.5 rounded bg-[#f7f5ef] hover:bg-[#ede9dc] text-[#57554e] border border-[#dedad0] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#354c3c]"
                >
                  +7d
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(14)}
                  className="text-[10px] px-2 py-0.5 rounded bg-[#f7f5ef] hover:bg-[#ede9dc] text-[#57554e] border border-[#dedad0] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#354c3c]"
                >
                  +14d
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(30)}
                  className="text-[10px] px-2 py-0.5 rounded bg-[#f7f5ef] hover:bg-[#ede9dc] text-[#57554e] border border-[#dedad0] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#354c3c]"
                >
                  +30d
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="taskPrioritySelect" className="block text-xs font-semibold text-[#1f1e1a] mb-1.5">
                Priority level
              </label>
              <select
                id="taskPrioritySelect"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#dedad0] bg-[#fffefa] text-xs font-semibold text-[#1f1e1a] focus:outline-none focus:ring-2 focus:ring-[#354c3c] focus:border-[#354c3c] transition-all cursor-pointer"
              >
                <option value="High">High priority (Essential milestone)</option>
                <option value="Medium">Medium priority (Flexible)</option>
                <option value="Low">Low priority (Optional)</option>
              </select>
              <span className="text-[10px] text-[#57554e] block mt-1.5">
                High priority tasks appear emphasized on the timeline.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#f0eee8] mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#57554e] hover:text-[#1f1e1a] hover:bg-[#f7f5ef] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#354c3c]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button primary"
              style={{ padding: '10px 18px' }}
            >
              <span>Add task to timeline</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
