import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { buildPlan, recoverPlan } from './src/planner.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for deterministic plan generation
const planCache = new Map<string, { data: any; expiry: number }>();
// In-memory cache for assistant suggestions
const assistantCache = new Map<string, { data: any; expiry: number }>();

// Simple IP-based in-memory rate limiter for server protection
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimiter(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const clientRecord = rateLimitMap.get(ip);

    if (!clientRecord || now > clientRecord.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (clientRecord.count >= limit) {
      return res.status(429).json({
        error: 'Too many requests. Please slow down and try again shortly.',
      });
    }

    clientRecord.count++;
    next();
  };
}

async function startServer() {
  const app = express();

  // Security Headers Middleware
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // Body parser with strict size limit
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
      if (cached && cached.expiry > Date.now()) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached.data);
      }

      const plan = buildPlan(
        budget as string | number,
        guests as string | number,
        days as string | number,
        eventType
      );

      // Cache for 5 minutes
      planCache.set(cacheKey, { data: plan, expiry: Date.now() + 300_000 });
      res.setHeader('X-Cache', 'MISS');
      return res.json(plan);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid plan request parameters';
      return res.status(400).json({ error: message });
    }
  });

  // POST /api/recover
  app.post('/api/recover', rateLimiter(60, 60_000), (req: Request, res: Response) => {
    try {
      const { plan, change_type, value, category } = req.body;

      if (!change_type || typeof change_type !== 'string') {
        return res.status(400).json({ error: 'Change type is required.' });
      }

      const validChangeTypes = ['budget', 'vendor_increase', 'guests'];
      if (!validChangeTypes.includes(change_type)) {
        return res.status(400).json({ error: 'Unsupported change type.' });
      }

      const currentPlan = plan || buildPlan();
      const updated = recoverPlan(currentPlan, change_type, value, category);
      return res.json(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to calculate recovery plan';
      return res.status(400).json({ error: message });
    }
  });

  // POST /api/assistant
  app.post('/api/assistant', rateLimiter(20, 60_000), async (req: Request, res: Response) => {
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

      const plan = req.body.plan || buildPlan();
      const apiKey = process.env.GEMINI_API_KEY?.trim();

      if (!apiKey) {
        return res.json({
          mode: 'demo',
          answer:
            'Demo mode is active. Your budget, timeline, and recovery calculations work locally. Add GEMINI_API_KEY to enable personalized Gemini suggestions.',
        });
      }

      // Check cache for identical prompt & plan budget
      const cacheKey = `${sanitizedPrompt.toLowerCase()}:${plan.budget}:${plan.guests}:${plan.event_type}`;
      const cached = assistantCache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return res.json(cached.data);
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
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

      const response = await ai.models.generateContent({
        model,
        contents: `Event data: ${JSON.stringify(safePlanData)}\nUser request: ${sanitizedPrompt}`,
        config: {
          systemInstruction,
          temperature: 0.4,
        },
      });

      const result = {
        mode: 'gemini' as const,
        answer: response.text || 'No response generated from the model.',
      };

      // Cache successful response for 10 minutes
      assistantCache.set(cacheKey, { data: result, expiry: Date.now() + 600_000 });
      return res.json(result);
    } catch (err: unknown) {
      console.error('Gemini assistant error caught securely');
      return res.json({
        mode: 'fallback',
        answer: 'Gemini is temporarily unavailable. Your local planner is still working; try again later.',
      });
    }
  });

  // In development, hook into Vite's dev server middleware
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
  app.listen(port, '0.0.0.0', () => {
    console.log(`EventWise AI server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
