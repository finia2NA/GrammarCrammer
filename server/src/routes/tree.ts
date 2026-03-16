import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getTree, getNode, getNodePath, getDescendantDeckIds } from '../services/tree.service.js';

export const treeRouter = Router();

treeRouter.use(requireAuth);

treeRouter.get('/', async (req, res, next) => {
  try {
    const tree = await getTree(req.userId!);
    res.json(tree);
  } catch (e) { next(e); }
});

treeRouter.get('/:id', async (req, res, next) => {
  try {
    const node = await getNode(req.userId!, req.params.id);
    if (!node) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Node not found.' } }); return; }
    res.json(node);
  } catch (e) { next(e); }
});

treeRouter.get('/:id/path', async (req, res, next) => {
  try {
    const path = await getNodePath(req.userId!, req.params.id);
    res.json({ path });
  } catch (e) { next(e); }
});

treeRouter.get('/:id/descendant-deck-ids', async (req, res, next) => {
  try {
    const deckIds = await getDescendantDeckIds(req.userId!, req.params.id);
    res.json({ deckIds });
  } catch (e) { next(e); }
});
