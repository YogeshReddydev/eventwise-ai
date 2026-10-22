import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';

// Ensure test mode is active before server initialization
process.env.NODE_ENV = 'test';
delete process.env.GEMINI_API_KEY;

import {
  createServerApp,
  BoundedCache,
  BoundedRateLimiter,
  planCache,
} from '../server.ts';
import { buildPlan } from '../src/planner.ts';

describe('TypeScript Server & API Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    const app = createServerApp({ skipVite: true });
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  async function apiGet(path: string) {
    const res = await fetch(`${baseUrl}${path}`);
    const data = await res.json().catch(() => null);
    return { status: res.status, data, headers: res.headers };
  }

  async function apiPost(path: string, body: any, customHeaders: Record<string, string> = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...customHeaders },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data, headers: res.headers };
  }

  it('GET /api/health returns 200 and strict security headers', async () => {
    const { status, data, headers } = await apiGet('/api/health');
    assert.equal(status, 200);
    assert.equal(data.status, 'ok');
    assert.equal(data.service, 'EventWise AI');
    assert.equal(headers.get('x-content-type-options'), 'nosniff');
    assert.equal(headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.ok(headers.get('content-security-policy')?.includes("default-src 'self'"));
  });

  it('GET /api/plan returns default plan with exact category sum', async () => {
    const { status, data, headers } = await apiGet('/api/plan');
    assert.equal(status, 200);
    assert.equal(data.budget, 100000);
    assert.equal(data.guests, 150);
    assert.equal(data.event_type, 'Wedding');
    const total = data.categories.reduce((sum: number, c: any) => sum + c.amount, 0);
    assert.equal(total, 100000);
    assert.ok(headers.get('cache-control')?.includes('public'));
  });

  it('GET /api/plan handles custom parameters and validates caching headers', async () => {
    const uniqueBudget = 84321;
    const url = `/api/plan?budget=${uniqueBudget}&guests=90&days=30&event_type=Birthday`;

    const first = await apiGet(url);
    assert.equal(first.status, 200);
    assert.equal(first.data.budget, uniqueBudget);
    assert.equal(first.headers.get('x-cache'), 'MISS');

    const second = await apiGet(url);
    assert.equal(second.status, 200);
    assert.equal(second.data.budget, uniqueBudget);
    assert.equal(second.headers.get('x-cache'), 'HIT');
  });

  it('GET /api/plan rejects invalid query parameters', async () => {
    const resNegative = await apiGet('/api/plan?budget=-500');
    assert.equal(resNegative.status, 400);
    assert.ok(resNegative.data.error.includes('Budget must be positive'));

    const resZeroGuests = await apiGet('/api/plan?guests=0');
    assert.equal(resZeroGuests.status, 400);
    assert.ok(resZeroGuests.data.error.includes('guests at least 1'));
  });

  it('POST /api/recover successfully handles budget contraction', async () => {
    const plan = buildPlan(100000, 150, 60);
    const { status, data, headers } = await apiPost('/api/recover', {
      plan,
      change_type: 'budget',
      value: 80000,
    });
    assert.equal(status, 200);
    assert.equal(data.budget, 80000);
    assert.equal(data.requires_user_approval, true);
    assert.ok(data.recovery_notes.some((n: string) => n.includes('Budget reduced')));
    assert.equal(headers.get('cache-control'), 'no-store');
  });

  it('POST /api/recover successfully handles vendor quote increase', async () => {
    const plan = buildPlan(100000, 150, 60);
    const { status, data } = await apiPost('/api/recover', {
      plan,
      change_type: 'vendor_increase',
      value: 6000,
      category: 'Catering',
    });
    assert.equal(status, 200);
    const catering = data.categories.find((c: any) => c.name === 'Catering');
    const contingency = data.categories.find((c: any) => c.name === 'Contingency');
    assert.equal(catering.amount, 36000); // 30,000 + 6,000
    assert.equal(contingency.amount, 4000); // 10,000 - 6,000
  });

  it('POST /api/recover rejects invalid inputs, unsupported types, and missing categories', async () => {
    const plan = buildPlan(100000, 150, 60);

    const res1 = await apiPost('/api/recover', { plan, change_type: 'unsupported_type', value: 5000 });
    assert.equal(res1.status, 400);

    const res2 = await apiPost('/api/recover', {
      plan,
      change_type: 'vendor_increase',
      value: 5000,
      category: 'BogusCategory',
    });
    assert.equal(res2.status, 400);

    const res3 = await apiPost('/api/recover', {
      plan,
      change_type: 'budget',
      value: -100,
    });
    assert.equal(res3.status, 400);
  });

  it('POST /api/assistant operates in demo mode when GEMINI_API_KEY is not set', async () => {
    const { status, data } = await apiPost('/api/assistant', {
      prompt: 'Suggest cost-effective floral arrangements for 150 guests',
    });
    assert.equal(status, 200);
    assert.equal(data.mode, 'demo');
    assert.ok(data.answer.includes('Demo mode is active'));
  });

  it('POST /api/assistant rejects empty or whitespace-only questions', async () => {
    const res = await apiPost('/api/assistant', { prompt: '    ' });
    assert.equal(res.status, 400);
    assert.ok(res.data.error.includes('Please enter a question'));
  });

  it('POST /api/assistant rejects prompts exceeding character limit', async () => {
    const longPrompt = 'a'.repeat(2001);
    const res = await apiPost('/api/assistant', { prompt: longPrompt });
    assert.equal(res.status, 400);
    assert.ok(res.data.error.includes('2,000 characters'));
  });

  it('rejects oversized JSON request payloads (>100kb) with 413 Payload Too Large', async () => {
    const oversized = {
      plan: buildPlan(),
      change_type: 'budget',
      value: 50000,
      extra: 'x'.repeat(120 * 1024), // 120 KB
    };

    const res = await fetch(`${baseUrl}/api/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(oversized),
    });
    assert.equal(res.status, 413);
  });

  it('returns 404 for unknown API endpoints', async () => {
    const getRes = await apiGet('/api/non_existent_route');
    assert.equal(getRes.status, 404);

    const postRes = await apiPost('/api/another_non_existent', {});
    assert.equal(postRes.status, 404);
  });

  it('BoundedCache strictly bounds memory and evicts oldest items', () => {
    const cache = new BoundedCache<number>(3);
    cache.set('a', 1, 10000);
    cache.set('b', 2, 10000);
    cache.set('c', 3, 10000);
    assert.equal(cache.size(), 3);

    // Adding 4th item should evict 'a' (oldest)
    cache.set('d', 4, 10000);
    assert.equal(cache.size(), 3);
    assert.equal(cache.get('a'), undefined);
    assert.equal(cache.get('b'), 2);
    assert.equal(cache.get('d'), 4);
  });

  it('BoundedRateLimiter enforces request limits and respects maximum tracked IPs', () => {
    const limiter = new BoundedRateLimiter(3, 1000, 2);

    // Check limit
    assert.equal(limiter.check('ip1').allowed, true);
    assert.equal(limiter.check('ip1').allowed, true);
    assert.equal(limiter.check('ip1').allowed, true);
    assert.equal(limiter.check('ip1').allowed, false); // 4th request blocked

    // Check IP capacity bound
    limiter.check('ip2');
    limiter.check('ip3'); // evicts oldest ip
  });
});
