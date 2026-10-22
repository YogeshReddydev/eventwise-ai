import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { buildPlan, recoverPlan } from './src/planner.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '200kb' }));

  // API Endpoints
  app.get('/api/plan', (req, res) => {
    try {
      const budget = req.query.budget !== undefined ? req.query.budget : 100000;
      const guests = req.query.guests !== undefined ? req.query.guests : 150;
      const days = req.query.days !== undefined ? req.query.days : 60;
      const eventType = typeof req.query.event_type === 'string' ? req.query.event_type : 'Wedding';

      const plan = buildPlan(
        budget as string | number,
        guests as string | number,
        days as string | number,
        eventType
      );
      res.json(plan);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Invalid plan request parameters' });
    }
  });

  app.post('/api/recover', (req, res) => {
    try {
      const { plan, change_type, value, category } = req.body;
      const currentPlan = plan || buildPlan();
      const updated = recoverPlan(currentPlan, change_type, value, category);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to calculate recovery plan' });
    }
  });

  app.post('/api/assistant', async (req, res) => {
    try {
      const prompt = typeof req.body.prompt === 'string' ? req.body.prompt.trim() : '';
      if (!prompt) {
        return res.status(400).json({ error: 'Please enter a question.' });
      }
      if (prompt.length > 2000) {
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

      const response = await ai.models.generateContent({
        model,
        contents: `Event data: ${JSON.stringify(plan)}\nUser request: ${prompt}`,
        config: {
          systemInstruction,
          temperature: 0.4,
        },
      });

      return res.json({
        mode: 'gemini',
        answer: response.text || 'No response generated from the model.',
      });
    } catch (err: any) {
      console.error('Gemini assistant error:', err);
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
    app.get('*', (_req, res) => {
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
