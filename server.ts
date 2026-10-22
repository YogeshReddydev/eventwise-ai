import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { buildPlan, recoverPlan } from './src/planner.ts';
import { AssistantResponse, EventPlan } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Bounded, type-safe LRU cache with expiration to prevent memory leaks.
 */
export class BoundedCache<T> {
  private cache = new Map<string, { data: T; expiry: number }>();

  constructor(private readonly maxEntries: number = 500) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number): void {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest item (first key in iteration order)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, { data, expiry: Date.now() + ttlMs });
  }

  cleanup(): number {
    const now = Date.now();
    let count = 0;
    for (const [k, v] of this.cache.entries()) {
      if (now > v.expiry) {
        this.cache.delete(k);
        count++;
      }
    }
    return count;
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Bounded rate limiter with max tracked IPs to avoid unbounded memory growth.
 */
export class BoundedRateLimiter {
  private map = new Map<string, { count: number; resetTime: number }>();

  constructor(
    public readonly limit: number,
    public readonly windowMs: number,
    public readonly maxTrackedIps: number = 1000
  ) {}

  check(ip: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const record = this.map.get(ip);

    if (!record || now > record.resetTime) {
      if (this.map.size >= this.maxTrackedIps) {
        const oldest = this.map.keys().next().value;
        if (oldest !== undefined) this.map.delete(oldest);
      }
      this.map.set(ip, { count: 1, resetTime: now + this.windowMs });
      return { allowed: true, remaining: this.limit - 1 };
    }

    if (record.count >= this.limit) {
      return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: this.limit - record.count };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [ip, record] of this.map.entries()) {
      if (now > record.resetTime) {
        this.map.delete(ip);
      }
    }
  }

  reset(): void {
    this.map.clear();
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Safely determine client IP from socket remoteAddress without trusting spoofable forward headers
      const rawIp = req.socket.remoteAddress || '127.0.0.1';
      const ip = rawIp.replace(/^::ffff:/, '');
      const { allowed } = this.check(ip);
      if (!allowed) {
        res.status(429).json({
          error: 'Too many requests. Please slow down and try again shortly.',
        });
        return;
      }
      next();
    };
  }
}

// Bounded in-memory caches
export const planCache = new BoundedCache<EventPlan>(500);
export const assistantCache = new BoundedCache<AssistantResponse>(500);

// Bounded rate limiters
export const recoverLimiter = new BoundedRateLimiter(60, 60_000, 1000);
export const assistantLimiter = new BoundedRateLimiter(20, 60_000, 1000);

// Periodic garbage collection for expired entries (runs every 60s, non-blocking)
const cleanupTimer = setInterval(() => {
  planCache.cleanup();
  assistantCache.cleanup();
  recoverLimiter.cleanup();
  assistantLimiter.cleanup();
}, 60_000);
cleanupTimer.unref?.();

/**
 * Creates and configures the Express application.
 */
export function createServerApp(_options: { skipVite?: boolean } = {}) {
  const app = express();

  // Security Headers Middleware
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self' https://*.google.com;"
    );
    next();
  });

  // Body parser with strict size limit (rejects bodies > 100kb with 413)
  app.use(express.json({ limit: '100kb' }));

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'EventWise AI', timestamp: new Date().toISOString() });
  });

  // GET /api/plan
  app.get('/api/plan', (req: Request, res: Response) => {
    try {
      const budget = req.query.budget !== undefined ? req.query.budget : 100000;
      const guests = req.query.guests !== undefined ? req.query.guests : 150;
      const days = req.query.days !== undefined ? req.query.days : 60;
      const eventType = typeof req.query.event_type === 'string' ? req.query.event_type : 'Wedding';

      // Cache lookup
      const cacheKey = `${budget}:${guests}:${days}:${eventType}`;
      const cached = planCache.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
        return res.json(cached);
      }

      const plan = buildPlan(
        budget as string | number,
        guests as string | number,
        days as string | number,
        eventType
      );

      // Cache for 5 minutes (300,000ms)
      planCache.set(cacheKey, plan, 300_000);
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      return res.json(plan);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid plan request parameters';
      return res.status(400).json({ error: message });
    }
  });

  // POST /api/recover
  app.post('/api/recover', recoverLimiter.middleware(), (req: Request, res: Response) => {
    try {
      const { plan, change_type, value, category } = req.body;

      if (!change_type || typeof change_type !== 'string') {
        return res.status(400).json({ error: 'Change type is required.' });
      }

      const validChangeTypes = ['budget', 'vendor_increase', 'guests'];
      if (!validChangeTypes.includes(change_type)) {
        return res.status(400).json({ error: 'Unsupported change type.' });
      }

      if (value === undefined || value === null || (typeof value !== 'number' && typeof value !== 'string')) {
        return res.status(400).json({ error: 'A valid numeric value is required for recovery.' });
      }

      const numValue = Number(value);
      if (!Number.isFinite(numValue) || numValue <= 0) {
        return res.status(400).json({ error: 'Recovery value must be a positive number.' });
      }

      if (change_type === 'vendor_increase') {
        if (!category || typeof category !== 'string' || category.trim() === '') {
          return res.status(400).json({ error: 'Please select a valid event category for the vendor quote increase.' });
        }
      }

      const currentPlan = plan || buildPlan();
      if (!currentPlan || !Array.isArray(currentPlan.categories) || currentPlan.categories.length === 0) {
        return res.status(400).json({ error: 'Valid event plan is required for plan recovery.' });
      }

      const updated = recoverPlan(
        currentPlan,
        change_type,
        numValue,
        typeof category === 'string' ? category.trim() : undefined
      );

      res.setHeader('Cache-Control', 'no-store');
      return res.json(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to calculate recovery plan';
      return res.status(400).json({ error: message });
    }
  });

  // POST /api/assistant
  app.post('/api/assistant', assistantLimiter.middleware(), async (req: Request, res: Response) => {
    try {
      const rawPrompt = typeof req.body.prompt === 'string' ? req.body.prompt : '';
      // Sanitize: strip dangerous control characters and trim
      const sanitizedPrompt = rawPrompt.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();

      if (!sanitizedPrompt) {
        return res.status(400).json({ error: 'Please enter a question.' });
      }
      if (sanitizedPrompt.length > 2000) {
        return res.status(400).json({ error: 'Please keep the question under 2,000 characters.' });
      }

      const plan: EventPlan = req.body.plan || buildPlan();
      const apiKey = process.env.GEMINI_API_KEY?.trim();

      if (!apiKey) {
        return res.json({
          mode: 'demo',
          answer:
            'Demo mode is active. Your budget, timeline, and recovery calculations work locally. Add GEMINI_API_KEY to enable personalized Gemini suggestions.',
        });
      }

      // Check cache for identical prompt & plan key
      const cacheKey = `${sanitizedPrompt.toLowerCase()}:${plan.budget}:${plan.guests}:${plan.event_type}`;
      const cached = assistantCache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const systemInstruction =
        'You are EventWise AI, a practical and thoughtful event planning assistant. Use the supplied event data, clearly label all estimates, never claim a vendor is verified or booked, and keep advice concise, empathetic, and actionable.';

      // Strip vendor sensitive details if any before sending to GenAI
      const safePlanData = {
        event_type: plan.event_type,
        budget: plan.budget,
        guests: plan.guests,
        days_until_event: plan.days_until_event,
        per_guest_budget: plan.per_guest_budget,
        categories: plan.categories,
      };

      // Strict 8-second timeout on GenAI API calls to prevent hanging sockets
      const timeoutMs = 8000;
      let timer: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), timeoutMs);
        timer.unref?.();
      });

      try {
        const generatePromise = ai.models.generateContent({
          model,
          contents: `Event data: ${JSON.stringify(safePlanData)}\nUser request: ${sanitizedPrompt}`,
          config: {
            systemInstruction,
            temperature: 0.4,
          },
        });

        const response = await Promise.race([generatePromise, timeoutPromise]);
        if (timer) clearTimeout(timer);

        const result: AssistantResponse = {
          mode: 'gemini',
          answer: response.text?.trim() || 'No response generated from the model.',
        };

        // Cache successful response for 10 minutes
        assistantCache.set(cacheKey, result, 600_000);
        return res.json(result);
      } catch (genErr: unknown) {
        if (timer) clearTimeout(timer);
        console.warn('Gemini assistant request failed or timed out safely');
        return res.json({
          mode: 'fallback',
          answer: 'Gemini is temporarily unavailable. Your local planner is still working; try again later.',
        });
      }
    } catch (err: unknown) {
      console.warn('Assistant endpoint error handled safely');
      return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
    }
  });

  // Catch-all 404 for unmatched API routes
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found.' });
  });

  return app;
}

/**
 * Starts the HTTP server, mounting Vite middleware in dev or static files in production.
 */
export async function startServer() {
  const app = createServerApp();
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Dev server must always run on port 3000 in AI Studio
  const port = isProd && process.env.PORT ? Number(process.env.PORT) : 3000;
  return new Promise<void>((resolve) => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`EventWise AI server listening on http://0.0.0.0:${port}`);
      resolve();
    });
  });
}

// Automatically start server when run directly as main (not when imported in tests)
const isMain =
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
    process.argv[1].endsWith('server.ts'));

if (isMain && process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
