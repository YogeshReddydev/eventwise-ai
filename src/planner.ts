import { BudgetCategory, EventPlan, PlanningTask, VendorItem } from './types.ts';

export const DEFAULT_CATEGORIES: BudgetCategory[] = [
  { name: 'Venue', amount: 22000, essential: true },
  { name: 'Catering', amount: 30000, essential: true },
  { name: 'Decorations', amount: 12000, essential: false },
  { name: 'Photography', amount: 10000, essential: false },
  { name: 'Clothing & makeup', amount: 8000, essential: false },
  { name: 'Transport', amount: 5000, essential: false },
  { name: 'Invitations & gifts', amount: 3000, essential: false },
  { name: 'Contingency', amount: 10000, essential: true },
];

export const DEFAULT_TASKS: Array<{ title: string; leadDays: number; priority: 'High' | 'Medium' | 'Low' }> = [
  { title: 'Confirm budget and guest list', leadDays: 60, priority: 'High' },
  { title: 'Shortlist and visit venues', leadDays: 55, priority: 'High' },
  { title: 'Book venue', leadDays: 50, priority: 'High' },
  { title: 'Compare catering menus and quotes', leadDays: 45, priority: 'High' },
  { title: 'Book photographer', leadDays: 40, priority: 'Medium' },
  { title: 'Choose theme and decoration plan', leadDays: 35, priority: 'Medium' },
  { title: 'Send invitations', leadDays: 28, priority: 'High' },
  { title: 'Confirm clothing and makeup', leadDays: 21, priority: 'Medium' },
  { title: 'Confirm final guest count with vendors', leadDays: 10, priority: 'High' },
  { title: 'Reconfirm bookings and payments', leadDays: 3, priority: 'High' },
  { title: 'Prepare event-day run sheet', leadDays: 1, priority: 'High' },
];

export function money(value: number | string): number {
  return Math.round(Number(value) * 100) / 100;
}

export function formatINR(val: number | string): string {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function buildPlan(
  budgetInput: number | string = 100000,
  guestsInput: number | string = 150,
  daysInput: number | string = 60,
  eventType = 'Wedding'
): EventPlan {
  const budget = money(budgetInput);
  const guests = parseInt(String(guestsInput), 10);
  const days = parseInt(String(daysInput), 10);

  if (budget <= 0 || guests < 1 || days < 0 || isNaN(budget) || isNaN(guests) || isNaN(days)) {
    throw new Error('Budget must be positive, guests at least 1, and days cannot be negative.');
  }

  const categories: BudgetCategory[] = DEFAULT_CATEGORIES.map((item) => ({ ...item }));
  const baseTotal = categories.reduce((sum, item) => sum + item.amount, 0);
  const scale = budget / baseTotal;

  for (const item of categories) {
    item.amount = Math.round(item.amount * scale);
  }

  // Adjust any rounding difference onto contingency
  const diff = Math.round(budget - categories.reduce((sum, item) => sum + item.amount, 0));
  categories[categories.length - 1].amount += diff;

  const today = new Date();
  const tasks: PlanningTask[] = DEFAULT_TASKS.map((t) => {
    const offset = Math.min(days, t.leadDays);
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + Math.max(0, days - offset));
    return {
      title: t.title,
      due_date: targetDate.toISOString().split('T')[0],
      priority: t.priority,
      done: false,
    };
  });

  const vendors: VendorItem[] = categories
    .filter((x) => x.name !== 'Contingency')
    .map((x) => ({
      category: x.name,
      vendor: '',
      quote: x.amount,
      status: 'Not contacted',
    }));

  return {
    event_type: eventType,
    budget,
    guests,
    days_until_event: days,
    per_guest_budget: Math.round((budget / guests) * 100) / 100,
    categories,
    tasks,
    vendors,
    assumptions: [
      'All prices are illustrative estimates, not live market quotes.',
      'A contingency allocation is included in the initial budget model.',
      'Dates are generated relative to the day the plan is created.',
    ],
  };
}

export function recoverPlan(
  plan: EventPlan,
  changeType: string,
  value: number | string,
  category?: string
): EventPlan {
  const updated: EventPlan = JSON.parse(JSON.stringify(plan));
  const notes: string[] = [];

  if (changeType === 'budget') {
    const newBudget = money(value);
    if (newBudget <= 0 || isNaN(newBudget)) {
      throw new Error('New budget must be greater than zero.');
    }
    const oldBudget = updated.budget;
    if (newBudget < oldBudget) {
      const reduction = oldBudget - newBudget;
      const pool = [
        ...updated.categories.filter((c) => !c.essential),
        ...updated.categories.filter((c) => c.essential && c.name !== 'Contingency'),
      ];
      const totalPool = pool.reduce((sum, c) => sum + c.amount, 0);
      let remaining = reduction;

      for (const item of pool) {
        if (remaining <= 0) break;
        const cut = Math.min(item.amount, Math.round((reduction * item.amount) / Math.max(1, totalPool)));
        item.amount -= cut;
        remaining -= cut;
      }

      for (let i = pool.length - 1; i >= 0; i--) {
        if (remaining <= 0) break;
        const cut = Math.min(pool[i].amount, remaining);
        pool[i].amount -= cut;
        remaining -= cut;
      }

      const contingency = updated.categories.find((c) => c.name === 'Contingency')!;
      const otherTotal = updated.categories
        .filter((c) => c !== contingency)
        .reduce((sum, c) => sum + c.amount, 0);
      contingency.amount = Math.max(0, Math.round(newBudget - otherTotal));
      notes.push(
        `Budget reduced by ₹${reduction.toLocaleString('en-IN')}. Flexible categories were adjusted first; review the proposed cuts before accepting.`
      );
    } else {
      const extra = newBudget - oldBudget;
      const contingency = updated.categories.find((c) => c.name === 'Contingency')!;
      contingency.amount += extra;
      notes.push(
        `Budget increased by ₹${extra.toLocaleString('en-IN')}; the additional amount is held in contingency until you assign it.`
      );
    }
    updated.budget = newBudget;
  } else if (changeType === 'vendor_increase') {
    const increase = money(value);
    if (increase <= 0 || isNaN(increase)) {
      throw new Error('Vendor increase must be greater than zero.');
    }
    const contingency = updated.categories.find((c) => c.name === 'Contingency')!;
    const covered = Math.min(contingency.amount, increase);
    contingency.amount -= covered;
    let shortfall = increase - covered;

    if (shortfall > 0) {
      const candidates = updated.categories.filter((c) => !c.essential && c.name !== category);
      const available = candidates.reduce((sum, c) => sum + c.amount, 0);
      for (const item of candidates) {
        if (shortfall <= 0) break;
        const cut = Math.min(item.amount, Math.round((shortfall * item.amount) / Math.max(1, available)));
        item.amount -= cut;
        shortfall -= cut;
      }
      if (shortfall > 0) {
        notes.push(
          `The contingency cannot fully cover the increase; about ₹${shortfall.toLocaleString('en-IN')} remains unresolved. Request another quote or approve further cuts.`
        );
      }
    }

    const target = updated.categories.find((c) => c.name === category);
    if (target) {
      target.amount += increase;
    }
    notes.unshift(
      `Vendor quote increased by ₹${increase.toLocaleString('en-IN')}. Contingency was used first; proposed changes need your approval.`
    );
  } else if (changeType === 'guests') {
    const newGuests = parseInt(String(value), 10);
    if (newGuests < 1 || isNaN(newGuests)) {
      throw new Error('Guest count must be at least one.');
    }
    const oldGuests = updated.guests;
    updated.guests = newGuests;
    const delta = newGuests - oldGuests;
    const catering = updated.categories.find((c) => c.name === 'Catering')!;
    const estimatedDelta = Math.round((catering.amount / Math.max(1, oldGuests)) * delta);
    notes.push(
      `Guest count changed from ${oldGuests} to ${newGuests}. Catering may change by approximately ₹${estimatedDelta.toLocaleString('en-IN')}; this is an estimate, not a vendor quote.`
    );
  } else {
    throw new Error('Unsupported change type.');
  }

  updated.per_guest_budget = Math.round((updated.budget / updated.guests) * 100) / 100;
  updated.recovery_notes = notes;
  updated.requires_user_approval = true;

  return updated;
}
