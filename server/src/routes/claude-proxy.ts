import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  generateCards,
  judgeAnswer,
  reviewRejection,
  streamChat,
  streamExplanationGeneric,
  rateSession,
  generateWordHint,
} from '../services/claude.service.js';
import { CARD_CHAT_PROMPT } from '../constants/prompts.js';
import { AppError } from '../middleware/errorHandler.js';
import { getSetting } from '../services/settings.service.js';

const DEFAULT_CARD_COUNT = 10;

export const claudeProxyRouter = Router();
export const DEBUG_AI = true;

claudeProxyRouter.use(requireAuth);

function logAI(email: string, type: string, model: string) {
  console.log(`[AI] ${email} | ${type} | ${model}`);
}

// Non-streaming: generate cards
claudeProxyRouter.post('/cards', async (req, res, next) => {
  try {
    const { topic, language, count, explanation } = req.body;
    if (!topic || !language || count === undefined || count === null || !explanation) {
      throw new AppError(400, 'MISSING_FIELDS', 'topic, language, count, and explanation are required.');
    }
    let resolvedCount = Number(count);
    if (resolvedCount === 0) {
      const setting = await getSetting(req.userId!, 'default_card_count');
      resolvedCount = setting ? parseInt(setting, 10) : DEFAULT_CARD_COUNT;
    }
    logAI(req.userEmail!, 'cards', 'haiku');
    const result = await generateCards(req.userId!, topic, language, resolvedCount, explanation);
    res.json(result);
  } catch (e) { next(e); }
});

// Non-streaming: judge answer
claudeProxyRouter.post('/judge', async (req, res, next) => {
  try {
    const { card, userAnswer, language, explanation, brevity } = req.body;
    if (!card || !userAnswer || !language) {
      throw new AppError(400, 'MISSING_FIELDS', 'card, userAnswer, and language are required.');
    }
    const resolvedBrevity = brevity === 'brief' ? 'brief' : 'normal';
    logAI(req.userEmail!, `judge:${resolvedBrevity}`, 'haiku');
    const result = await judgeAnswer(req.userId!, card, userAnswer, language, explanation, resolvedBrevity);
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
    logAI(req.userEmail!, 'explanation', 'sonnet');
    await streamExplanationGeneric(req, res, req.userId!, topic, language);
  } catch (e) { next(e); }
});

// Non-streaming: rejection review
claudeProxyRouter.post('/rejection', async (req, res, next) => {
  try {
    const { card, userAnswer, language, explanation, brevity } = req.body;
    if (!card || !userAnswer || !language) {
      throw new AppError(400, 'MISSING_FIELDS', 'card, userAnswer, and language are required.');
    }
    const resolvedBrevity = brevity === 'brief' ? 'brief' : 'normal';
    logAI(req.userEmail!, `rejection:${resolvedBrevity}`, 'sonnet');
    const result = await reviewRejection(req.userId!, card, userAnswer, language, explanation, resolvedBrevity);
    res.json(result);
  } catch (e) { next(e); }
});

// Non-streaming: rate session
claudeProxyRouter.post('/rate-session', async (req, res, next) => {
  try {
    const { topic, language, cards } = req.body;
    if (!topic || !language || !Array.isArray(cards)) {
      throw new AppError(400, 'MISSING_FIELDS', 'topic, language, and cards are required.');
    }
    logAI(req.userEmail!, 'rate-session', 'haiku');
    const result = await rateSession(req.userId!, topic, language, cards);
    res.json(result);
  } catch (e) { next(e); }
});

// Non-streaming: word hint
claudeProxyRouter.post('/word-hint', async (req, res, next) => {
  try {
    const { word, english, targetLanguage, language } = req.body;
    if (!word || !english || !targetLanguage || !language) {
      throw new AppError(400, 'MISSING_FIELDS', 'word, english, targetLanguage, and language are required.');
    }
    logAI(req.userEmail!, 'word-hint', 'haiku');
    const result = await generateWordHint(req.userId!, word, english, targetLanguage, language);
    res.json(result);
  } catch (e) { next(e); }
});

// Streaming: chat
claudeProxyRouter.post('/chat/stream', async (req, res, next) => {
  try {
    const { card, userAnswer, language, wasCorrect, messages, explanation } = req.body;
    if (!card || !userAnswer || !language || wasCorrect === undefined || !messages) {
      throw new AppError(400, 'MISSING_FIELDS', 'card, userAnswer, language, wasCorrect, and messages are required.');
    }
    logAI(req.userEmail!, 'chat', 'sonnet');
    const systemPrompt = CARD_CHAT_PROMPT(
      language, card.english, card.targetLanguage,
      userAnswer, wasCorrect, card.sentenceContext, explanation,
    );
    await streamChat(req, res, req.userId!, systemPrompt, messages);
  } catch (e) { next(e); }
});
