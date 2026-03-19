import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSetting, setSetting } from '../services/settings.service.js';
import { prisma } from '../lib/prisma.js';
import { encrypt, decrypt } from '../services/crypto.service.js';
import { AppError } from '../middleware/errorHandler.js';

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

// API key management
settingsRouter.put('/api-key', async (req, res, next) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) throw new AppError(400, 'MISSING_FIELDS', 'apiKey is required.');

    // Validate key first
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as any;
      throw new AppError(400, 'INVALID_KEY', err?.error?.message ?? 'Invalid API key.');
    }

    const encrypted = encrypt(apiKey);
    await prisma.user.update({
      where: { id: req.userId! },
      data: { claudeApiKey: encrypted },
    });

    res.json({ success: true });
  } catch (e) { next(e); }
});

settingsRouter.delete('/api-key', async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.userId! },
      data: { claudeApiKey: null },
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});

settingsRouter.get('/api-key/status', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { claudeApiKey: true },
    });
    res.json({ hasKey: !!user?.claudeApiKey });
  } catch (e) { next(e); }
});

// Generic settings
settingsRouter.get('/:key', async (req, res, next) => {
  try {
    const value = await getSetting(req.userId!, req.params.key);
    res.json({ value });
  } catch (e) { next(e); }
});

settingsRouter.put('/:key', async (req, res, next) => {
  try {
    const { value } = req.body;
    if (value === undefined) throw new AppError(400, 'MISSING_FIELDS', 'value is required.');
    await setSetting(req.userId!, req.params.key, value);
    res.json({ success: true });
  } catch (e) { next(e); }
});
