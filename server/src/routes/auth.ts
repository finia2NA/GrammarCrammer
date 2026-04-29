import { Router } from 'express';
import { register, login, findOrCreateByApple, findOrCreateByGoogle, getMe } from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { config } from '../config.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError(400, 'MISSING_FIELDS', 'Email and password are required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError(400, 'INVALID_EMAIL', 'Please enter a valid email address.');
    if (password.length < 8) throw new AppError(400, 'WEAK_PASSWORD', 'Password must be at least 8 characters.');
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) throw new AppError(400, 'WEAK_PASSWORD', 'Password must contain at least one letter and one number.');
    const result = await register(email, password);
    res.status(201).json(result);
  } catch (e) { next(e); }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError(400, 'MISSING_FIELDS', 'Email and password are required.');
    const result = await login(email, password);
    res.json(result);
  } catch (e) { next(e); }
});

authRouter.post('/apple', async (req, res, next) => {
  try {
    const { identityToken } = req.body;
    if (!identityToken) throw new AppError(400, 'MISSING_FIELDS', 'identityToken is required.');

    // Dynamically import apple-signin-auth to avoid issues if not configured
    const appleSignin = await import('apple-signin-auth');
    const payload = await appleSignin.verifyIdToken(identityToken, {
      audience: config.appleClientId,
      ignoreExpiration: false,
    });

    const appleId = payload.sub;
    const email = payload.email ?? null;
    const result = await findOrCreateByApple(appleId, email);
    res.json(result);
  } catch (e) { next(e); }
});

authRouter.post('/google', async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) throw new AppError(400, 'MISSING_FIELDS', 'idToken is required.');

    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(config.googleClientId);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) throw new AppError(401, 'INVALID_TOKEN', 'Invalid Google token.');

    const result = await findOrCreateByGoogle(payload.sub, payload.email ?? null);
    res.json(result);
  } catch (e) { next(e); }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await getMe(req.userId!);
    res.json(result);
  } catch (e) { next(e); }
});

authRouter.post('/validate-key', requireAuth, async (req, res, next) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) throw new AppError(400, 'MISSING_FIELDS', 'apiKey is required.');

    // Quick validation: make a minimal API call
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

    if (response.ok) {
      res.json({ valid: true });
    } else {
      const err = await response.json().catch(() => ({})) as any;
      res.json({ valid: false, error: err?.error?.message ?? `HTTP ${response.status}` });
    }
  } catch (e) { next(e); }
});
