import React, { useState } from 'react';
import { Calendar, CheckCircle2, Clock, Plus, Tag } from 'lucide-react';
import { EventPlan, PlanningTask, Priority } from '../types.ts';
import { AddTaskModal } from './AddTaskModal.tsx';

interface TimelineSectionProps {
  plan: EventPlan;
  onToggleTask: (index: number) => void;
  onAddTask: (task: PlanningTask) => void;
}

export const TimelineSection: React.FC<TimelineSectionProps> = ({ plan, onToggleTask, onAddTask }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const filteredTasks = plan.tasks
    .map((task, idx) => ({ task, originalIdx: idx }))
    .filter(({ task }) => {
      if (filter === 'pending') return !task.done;
      if (filter === 'completed') return task.done;
      return true;
    });

  return (
    <section className="bg-white rounded-2xl border border-[#e9e5db] p-6 sm:p-8 mb-8 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#bd7651]">
            One step at a time
          </span>
          <h2 className="text-xl sm:text-2xl font-serif text-[#24231f]">Your planning timeline</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#f7f5ef] p-1 rounded-xl text-xs font-semibold text-[#5d5b53] border border-[#e9e5db]">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === 'all' ? 'bg-white text-[#24231f] shadow-2xs' : 'hover:text-[#24231f]'
              }`}
            >
              All ({plan.tasks.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === 'pending' ? 'bg-white text-[#24231f] shadow-2xs' : 'hover:text-[#24231f]'
              }`}
            >
              Pending ({plan.tasks.filter((t) => !t.done).length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === 'completed' ? 'bg-white text-[#24231f] shadow-2xs' : 'hover:text-[#24231f]'
              }`}
            >
              Done ({plan.tasks.filter((t) => t.done).length})
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="button primary"
            style={{ padding: '8px 14px' }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add task</span>
          </button>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
        {filteredTasks.map(({ task, originalIdx }) => (
          <label
            key={originalIdx}
            className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
              task.done
                ? 'bg-[#fcfbf7] border-[#ede9df] opacity-65'
                : 'bg-white border-[#f0eee6] hover:border-[#dedad0] hover:bg-[#fefdfb]'
            }`}
          >
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => onToggleTask(originalIdx)}
              className="mt-1 w-4 h-4 rounded text-[#405b49] focus:ring-[#405b49] cursor-pointer shrink-0 accent-[#405b49]"
            />
            <div className="flex-1 min-w-0">
              <span
                className={`text-xs font-semibold block leading-snug ${
                  task.done ? 'line-through text-[#9b988e]' : 'text-[#24231f]'
                }`}
              >
                {task.title}
              </span>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#79776f] flex-wrap">
                <span className="flex items-center gap-1 font-mono text-[10px]">
                  <Clock className="w-3 h-3 text-[#969187]" />
                  <span>Due {task.due_date}</span>
                </span>
                <span>•</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    task.priority === 'High'
                      ? 'bg-[#faebe8] text-[#9a3821]'
                      : task.priority === 'Medium'
                      ? 'bg-[#f5ede3] text-[#795d33]'
                      : 'bg-[#edf4f9] text-[#20577d]'
                  }`}
                >
                  {task.priority}
                </span>
                {task.category && (
                  <>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#e9eee8] text-[#3e5a47] font-semibold">
                      {task.category}
                    </span>
                  </>
                )}
              </div>
            </div>
          </label>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-8 text-xs text-[#79776f] bg-[#fbfaf6] rounded-xl border border-dashed border-[#dedad0]">
          No tasks found matching the selected filter.
        </div>
      )}

      {/* Dedicated Add Task Modal Component */}
      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddTask={(task) => {
          onAddTask(task);
          setShowAddModal(false);
        }}
        categories={plan.categories.map((c) => c.name)}
        daysUntilEvent={plan.days_until_event}
      />
    </section>
  );
};
