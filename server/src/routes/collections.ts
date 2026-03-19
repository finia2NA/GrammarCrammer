import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { renameCollection, moveNode, deleteNode } from '../services/deck.service.js';
import { getDescendantDeckIds } from '../services/tree.service.js';

export const collectionsRouter = Router();

collectionsRouter.use(requireAuth);

collectionsRouter.patch('/:nodeId', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (name) await renameCollection(req.userId!, req.params.nodeId, name);
    res.json({ success: true });
  } catch (e) { next(e); }
});

collectionsRouter.post('/:id/move', async (req, res, next) => {
  try {
    const { newPath } = req.body;
    await moveNode(req.userId!, req.params.id, newPath);
    res.json({ success: true });
  } catch (e) { next(e); }
});

collectionsRouter.delete('/:id', async (req, res, next) => {
  try {
    await deleteNode(req.userId!, req.params.id);
    res.json({ success: true });
  } catch (e) { next(e); }
});

collectionsRouter.get('/:id/descendant-deck-ids', async (req, res, next) => {
  try {
    const deckIds = await getDescendantDeckIds(req.userId!, req.params.id);
    res.json({ deckIds });
  } catch (e) { next(e); }
});
