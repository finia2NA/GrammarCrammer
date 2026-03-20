import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createDeckFromPath, getDeck, updateDeck, deleteNode, setLastStudied } from '../services/deck.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateDeckExplanation } from '../services/claude.service.js';

export const decksRouter = Router();

decksRouter.use(requireAuth);

decksRouter.post('/', async (req, res, next) => {
  try {
    const { path, topic, language, cardCount } = req.body;
    if (!path || !topic || !language) {
      throw new AppError(400, 'MISSING_FIELDS', 'path, topic, and language are required.');
    }
    const nodeId = await createDeckFromPath(req.userId!, path, topic, language, cardCount);

    // Trigger background explanation generation
    console.log(`[AI] ${req.userEmail} | deck-explanation | sonnet`);
    generateDeckExplanation(req.userId!, nodeId).catch(err => {
      console.error(`[deck] Background explanation failed for ${nodeId}:`, err);
    });

    res.status(201).json({ nodeId });
  } catch (e) { next(e); }
});

decksRouter.get('/:nodeId', async (req, res, next) => {
  try {
    const deck = await getDeck(req.userId!, req.params.nodeId);
    if (!deck) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deck not found.' } }); return; }
    res.json(deck);
  } catch (e) { next(e); }
});

decksRouter.patch('/:nodeId', async (req, res, next) => {
  try {
    const { name, topic, language, cardCount } = req.body;
    const result = await updateDeck(req.userId!, req.params.nodeId, { name, topic, language, cardCount });

    if (result.regenerateExplanation) {
      console.log(`[AI] ${req.userEmail} | deck-explanation | sonnet`);
      generateDeckExplanation(req.userId!, req.params.nodeId).catch(err => {
        console.error(`[deck] Background explanation failed for ${req.params.nodeId}:`, err);
      });
    }

    res.json(result);
  } catch (e) { next(e); }
});

decksRouter.post('/:nodeId/generate-explanation', async (req, res, next) => {
  try {
    // Manual re-trigger — streams SSE back to client
    console.log(`[AI] ${req.userEmail} | deck-explanation-stream | sonnet`);
    const { streamExplanation } = await import('../services/claude.service.js');
    await streamExplanation(req, res, req.userId!, req.params.nodeId);
  } catch (e) { next(e); }
});

decksRouter.post('/:nodeId/mark-studied', async (req, res, next) => {
  try {
    await setLastStudied(req.params.nodeId);
    res.json({ success: true });
  } catch (e) { next(e); }
});

decksRouter.delete('/:nodeId', async (req, res, next) => {
  try {
    await deleteNode(req.userId!, req.params.nodeId);
    res.json({ success: true });
  } catch (e) { next(e); }
});
