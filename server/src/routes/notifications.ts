import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { registerPushDevice, unregisterPushDevice } from '../services/notification.service.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.post('/register', async (req, res, next) => {
  try {
    const { expoPushToken, platform } = req.body;
    if (typeof expoPushToken !== 'string' || expoPushToken.trim().length === 0) {
      throw new AppError(400, 'MISSING_FIELDS', 'expoPushToken is required.');
    }

    await registerPushDevice(req.userId!, expoPushToken, platform);
    res.json({ success: true });
  } catch (e) { next(e); }
});

notificationsRouter.post('/unregister', async (req, res, next) => {
  try {
    const { expoPushToken } = req.body;
    await unregisterPushDevice(
      req.userId!,
      typeof expoPushToken === 'string' ? expoPushToken : undefined,
    );
    res.json({ success: true });
  } catch (e) { next(e); }
});
