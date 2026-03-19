import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  generateCards,
  judgeAnswer,
  streamRejection,
  streamChat,
  streamExplanationGeneric,
} from '../services/claude.service.js';
import { AppError } from '../middleware/errorHandler.js';

export const claudeProxyRouter = Router();

claudeProxyRouter.use(requireAuth);

// Non-streaming: generate cards
claudeProxyRouter.post('/cards', async (req, res, next) => {
  try {
    const { topic, language, count, explanation } = req.body;
    if (!topic || !language || !count || !explanation) {
      throw new AppError(400, 'MISSING_FIELDS', 'topic, language, count, and explanation are required.');
    }
    const result = await generateCards(req.userId!, topic, language, count, explanation);
    res.json(result);
  } catch (e) { next(e); }
});

// Non-streaming: judge answer
claudeProxyRouter.post('/judge', async (req, res, next) => {
  try {
    const { card, userAnswer, language } = req.body;
    if (!card || !userAnswer || !language) {
      throw new AppError(400, 'MISSING_FIELDS', 'card, userAnswer, and language are required.');
    }
    const result = await judgeAnswer(req.userId!, card, userAnswer, language);
    res.json(result);
  } catch (e) { next(e); }
});

// Streaming: explanation
claudeProxyRouter.post('/explanation/stream', async (req, res, next) => {
  try {
    const { topic, language } = req.body;
    if (!topic || !language) {
      throw new AppError(400, 'MISSING_FIELDS', 'topic and language are required.');
    }
    await streamExplanationGeneric(req, res, req.userId!, topic, language);
  } catch (e) { next(e); }
});

// Streaming: rejection explanation
claudeProxyRouter.post('/rejection/stream', async (req, res, next) => {
  try {
    const { card, userAnswer, language } = req.body;
    if (!card || !userAnswer || !language) {
      throw new AppError(400, 'MISSING_FIELDS', 'card, userAnswer, and language are required.');
    }
    await streamRejection(req, res, req.userId!, card, userAnswer, language);
  } catch (e) { next(e); }
});

// Streaming: chat
claudeProxyRouter.post('/chat/stream', async (req, res, next) => {
  try {
    const { systemPrompt, messages } = req.body;
    if (!systemPrompt || !messages) {
      throw new AppError(400, 'MISSING_FIELDS', 'systemPrompt and messages are required.');
    }
    await streamChat(req, res, req.userId!, systemPrompt, messages);
  } catch (e) { next(e); }
});
