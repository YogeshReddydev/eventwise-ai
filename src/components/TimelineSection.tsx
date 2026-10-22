import React, { useMemo, useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import { EventPlan, PlanningTask } from '../types.ts';
import { AddTaskModal } from './AddTaskModal.tsx';

interface TimelineSectionProps {
  plan: EventPlan;
  onToggleTask: (index: number) => void;
  onAddTask: (task: PlanningTask) => void;
}

export const TimelineSection: React.FC<TimelineSectionProps> = ({ plan, onToggleTask, onAddTask }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const filteredTasks = useMemo(() => {
    return plan.tasks
      .map((task, idx) => ({ task, originalIdx: idx }))
      .filter(({ task }) => {
        if (filter === 'pending') return !task.done;
        if (filter === 'completed') return task.done;
        return true;
      });
  }, [plan.tasks, filter]);

  return (
    <section className="bg-white rounded-2xl border border-[#dedad0] p-6 sm:p-8 mb-8 shadow-xs" aria-labelledby="timeline-heading">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9c4f2b]">
            One step at a time
          </span>
          <h2 id="timeline-heading" className="text-xl sm:text-2xl font-serif text-[#1f1e1a]">Your planning timeline</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#f7f5ef] p-1 rounded-xl text-xs font-semibold text-[#57554e] border border-[#dedad0]" role="tablist" aria-label="Filter tasks by completion status">
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === 'all' ? 'bg-white text-[#1f1e1a] shadow-2xs' : 'hover:text-[#1f1e1a]'
              }`}
            >
              All ({plan.tasks.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'pending'}
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === 'pending' ? 'bg-white text-[#1f1e1a] shadow-2xs' : 'hover:text-[#1f1e1a]'
              }`}
            >
              Pending ({plan.tasks.filter((t) => !t.done).length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'completed'}
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === 'completed' ? 'bg-white text-[#1f1e1a] shadow-2xs' : 'hover:text-[#1f1e1a]'
              }`}
            >
              Done ({plan.tasks.filter((t) => t.done).length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            aria-label="Add custom planning task"
            className="button primary"
            style={{ padding: '8px 14px' }}
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Add task</span>
          </button>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5" role="list" aria-label="Planning milestones and tasks">
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
              aria-label={`Mark task "${task.title}" as ${task.done ? 'incomplete' : 'complete'}`}
              onChange={() => onToggleTask(originalIdx)}
              className="mt-1 w-4 h-4 rounded text-[#354c3c] focus:ring-[#354c3c] cursor-pointer shrink-0 accent-[#354c3c]"
            />
            <div className="flex-1 min-w-0">
              <span
                className={`text-xs font-semibold block leading-snug ${
                  task.done ? 'line-through text-[#57554e]' : 'text-[#1f1e1a]'
                }`}
              >
                {task.title}
              </span>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#57554e] flex-wrap">
                <span className="flex items-center gap-1 font-mono text-[10px]">
                  <Clock className="w-3 h-3 text-[#57554e]" aria-hidden="true" />
                  <span>Due {task.due_date}</span>
                </span>
                <span aria-hidden="true">•</span>
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
                    <span aria-hidden="true">•</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#e9eee8] text-[#354c3c] font-semibold">
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
        <div className="text-center py-8 text-xs text-[#57554e] bg-[#fbfaf6] rounded-xl border border-dashed border-[#dedad0]">
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
