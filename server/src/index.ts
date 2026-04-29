import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { treeRouter } from './routes/tree.js';
import { decksRouter } from './routes/decks.js';
import { collectionsRouter } from './routes/collections.js';
import { settingsRouter } from './routes/settings.js';
import { claudeProxyRouter } from './routes/claude-proxy.js';
import { resetPageRouter } from './routes/reset-page.js';
import { initScheduler } from './services/scheduler.service.js';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/tree', treeRouter);
app.use('/api/decks', decksRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/nodes', collectionsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/ai', claudeProxyRouter);

// Password reset page (served as HTML, not JSON API)
app.use(resetPageRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Error handler (must be last)
app.use(errorHandler);

const host = process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0';
app.listen(config.port, host, () => {
  console.log(`[server] Listening on http://${host}:${config.port}`);
  initScheduler().catch(err => {
    console.error('[scheduler] Failed to initialize:', err);
  });
});
