import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, recoverPlan, formatINR, money } from '../src/planner.ts';
import { PlannerValidationError, PlanRecoveryError, EventPlan } from '../src/types.ts';

describe('TypeScript Planner Logic Tests', () => {
  it('builds default wedding plan with exact sum and categories', () => {
    const plan = buildPlan();
    assert.equal(plan.budget, 100000);
    assert.equal(plan.guests, 150);
    assert.equal(plan.days_until_event, 60);
    assert.equal(plan.event_type, 'Wedding');
    const sum = plan.categories.reduce((acc, c) => acc + c.amount, 0);
    assert.equal(sum, 100000);
    assert.equal(plan.tasks.length, 11);
    assert.equal(plan.vendors.length, 7);
  });

  it('correctly handles boundary parameters (budget=1, guests=1, days=0)', () => {
    const plan = buildPlan(1, 1, 0);
    assert.equal(plan.budget, 1);
    assert.equal(plan.guests, 1);
    assert.equal(plan.days_until_event, 0);
    const sum = plan.categories.reduce((acc, c) => acc + c.amount, 0);
    assert.equal(sum, 1);
  });

  it('verifies exact sum for odd and irregular budgets', () => {
    for (const oddBudget of [77777, 123456, 333333, 999999, 1000000000]) {
      const plan = buildPlan(oddBudget, 100, 45);
      const sum = plan.categories.reduce((acc, c) => acc + c.amount, 0);
      assert.equal(sum, oddBudget, `Categories sum must equal budget for ${oddBudget}`);
    }
  });

  it('supports custom event types correctly', () => {
    for (const evt of ['Birthday', 'Community event', 'Corporate Gala', 'Anniversary Celebration']) {
      const plan = buildPlan(50000, 50, 20, evt);
      assert.equal(plan.event_type, evt);
      assert.equal(plan.categories.reduce((sum, c) => sum + c.amount, 0), 50000);
    }
  });

  it('rejects invalid inputs with descriptive errors and PlannerValidationError', () => {
    assert.throws(() => buildPlan(0, 100, 30), (err: unknown) => err instanceof PlannerValidationError && /Budget must be positive/.test(err.message));
    assert.throws(() => buildPlan(-5000, 100, 30), (err: unknown) => err instanceof PlannerValidationError && /Budget must be positive/.test(err.message));
    assert.throws(() => buildPlan(100000, 0, 30), (err: unknown) => err instanceof PlannerValidationError && /guests at least 1/.test(err.message));
    assert.throws(() => buildPlan(100000, -5, 30), (err: unknown) => err instanceof PlannerValidationError && /guests at least 1/.test(err.message));
    assert.throws(() => buildPlan(100000, 100, -1), (err: unknown) => err instanceof PlannerValidationError && /days cannot be negative/.test(err.message));
    assert.throws(() => buildPlan('abc' as unknown as number, 100, 30), (err: unknown) => err instanceof PlannerValidationError && /Budget must be positive/.test(err.message));
    assert.throws(() => buildPlan(100000, 150.5, 30), (err: unknown) => err instanceof PlannerValidationError && /guests at least 1/.test(err.message));
    assert.throws(() => buildPlan(100000, 150, 30.5), (err: unknown) => err instanceof PlannerValidationError && /days cannot be negative/.test(err.message));
  });

  it('rejects values exceeding maximum safety limits', () => {
    assert.throws(() => buildPlan(1000000001, 100, 30), /Budget cannot exceed/);
    assert.throws(() => buildPlan(100000, 1000001, 30), /Guest count cannot exceed/);
    assert.throws(() => buildPlan(100000, 100, 3651), /Days until event cannot exceed/);
  });

  it('guarantees immutability of the source plan upon recovery', () => {
    const original = buildPlan(100000, 150, 60);
    const originalCategories = JSON.parse(JSON.stringify(original.categories));

    const proposed = recoverPlan(original, 'budget', 75000);

    assert.equal(original.budget, 100000);
    assert.deepEqual(original.categories, originalCategories);
    assert.equal(proposed.budget, 75000);
    assert.equal(proposed.categories.reduce((acc, c) => acc + c.amount, 0), 75000);
    assert.equal(proposed.requires_user_approval, true);
  });

  it('handles budget contraction with priority on flexible categories', () => {
    const original = buildPlan(100000, 150, 60);
    const proposed = recoverPlan(original, 'budget', 85000);
    assert.equal(proposed.budget, 85000);
    assert.equal(proposed.categories.reduce((acc, c) => acc + c.amount, 0), 85000);
    assert.ok(proposed.recovery_notes && proposed.recovery_notes.some((n) => n.includes('Budget reduced')));
  });

  it('handles budget expansion by placing surplus in contingency', () => {
    const original = buildPlan(100000, 150, 60);
    const origContingency = original.categories.find((c) => c.name === 'Contingency')!.amount;
    const proposed = recoverPlan(original, 'budget', 120000);
    assert.equal(proposed.budget, 120000);
    const newContingency = proposed.categories.find((c) => c.name === 'Contingency')!.amount;
    assert.equal(newContingency, origContingency + 20000);
  });

  it('handles vendor quote increase using contingency first', () => {
    const original = buildPlan(100000, 150, 60);
    const proposed = recoverPlan(original, 'vendor_increase', 4000, 'Catering');
    const catering = proposed.categories.find((c) => c.name === 'Catering')!;
    const contingency = proposed.categories.find((c) => c.name === 'Contingency')!;
    assert.equal(catering.amount, 34000); // 30,000 + 4,000
    assert.equal(contingency.amount, 6000); // 10,000 - 4,000
  });

  it('handles vendor increase exceeding contingency and flags shortfall', () => {
    const original = buildPlan(100000, 150, 60);
    // Contingency is 10,000; increase Catering by 15,000
    const proposed = recoverPlan(original, 'vendor_increase', 15000, 'Catering');
    const contingency = proposed.categories.find((c) => c.name === 'Contingency')!;
    assert.equal(contingency.amount, 0);
    assert.ok(proposed.recovery_notes && proposed.recovery_notes.some((n) => n.toLowerCase().includes('contingency')));
  });

  it('rejects vendor increase on non-existent category', () => {
    const original = buildPlan();
    assert.throws(
      () => recoverPlan(original, 'vendor_increase', 5000, 'UnderwaterBasketWeaving'),
      /Please select a valid event category/
    );
  });

  it('handles guest count adjustments with catering notes', () => {
    const original = buildPlan(100000, 150, 60);
    const proposed = recoverPlan(original, 'guests', 200);
    assert.equal(proposed.guests, 200);
    assert.equal(proposed.per_guest_budget, 500);
    assert.ok(proposed.recovery_notes && proposed.recovery_notes[0].includes('Catering may change'));
  });

  it('rejects recoverPlan calls with invalid or null plan and throws PlanRecoveryError', () => {
    assert.throws(
      () => recoverPlan(null as unknown as EventPlan, 'budget', 50000),
      (err: unknown) => err instanceof PlanRecoveryError && /Valid event plan is required/.test(err.message)
    );
    assert.throws(
      () => recoverPlan({} as unknown as EventPlan, 'budget', 50000),
      (err: unknown) => err instanceof PlanRecoveryError && /Valid event plan is required/.test(err.message)
    );
    assert.throws(
      () => recoverPlan({ categories: [] } as unknown as EventPlan, 'budget', 50000),
      (err: unknown) => err instanceof PlanRecoveryError && /Valid event plan is required/.test(err.message)
    );
  });

  it('correctly formats currency with formatINR and handles money helper', () => {
    assert.ok(formatINR(100000).includes('1,00,000'));
    assert.ok(formatINR(0).includes('0'));
    assert.equal(money(123.456), 123.46);
    assert.equal(money('500.2'), 500.2);
    assert.ok(Number.isNaN(money('invalid-number')));
  });
});
