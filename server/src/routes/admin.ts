import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { prisma } from '../lib/prisma.js';
import { getAllGlobalConfig, getUserBudget, setGlobalConfig } from '../services/global-config.service.js';
import { currentYearMonth } from '../services/usage.service.js';
import { getUserTier, type UserTier } from '../services/user-tier.service.js';
import {
  fetchProviderModels,
  getAiRoutingAdminPayload,
  getProviderAvailability,
  saveAiRoutingConfig,
} from '../services/ai-routing.service.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/users', async (req, res, next) => {
  try {
    const tierFilter = typeof req.query.tier === 'string' ? req.query.tier : 'all';
    const hasUsageOnly = req.query.hasUsage === 'true';
    if (!['all', 'free', 'paid'].includes(tierFilter)) {
      throw new AppError(400, 'INVALID_FILTER', 'tier must be all, free, or paid.');
    }

    const yearMonth = currentYearMonth();
    const [users, summaries, config] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, role: true, createdAt: true },
      }),
      prisma.monthlyUsageSummary.findMany({
        where: { yearMonth },
        select: { userId: true, source: true, totalCost: true },
      }),
      getAllGlobalConfig(),
    ]);

    const usageByUser = new Map<string, { central: number; own: number }>();
    for (const summary of summaries) {
      const usage = usageByUser.get(summary.userId) ?? { central: 0, own: 0 };
      if (summary.source === 'central') usage.central = summary.totalCost;
      if (summary.source === 'own') usage.own = summary.totalCost;
      usageByUser.set(summary.userId, usage);
    }

    const budgetByTier = new Map<UserTier, number>();
    const getBudget = async (tier: UserTier) => {
      const cached = budgetByTier.get(tier);
      if (cached != null) return cached;
      const budget = await getUserBudget(tier);
      budgetByTier.set(tier, budget);
      return budget;
    };

    const rows = await Promise.all(users.map(async user => {
      const tier = await getUserTier(user.id);
      const budget = await getBudget(tier);
      const usage = usageByUser.get(user.id) ?? { central: 0, own: 0 };
      const usagePercent = budget > 0 ? (usage.central / budget) * 100 : 0;
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        tier,
        usage,
        budget,
        usagePercent,
        createdAt: user.createdAt,
      };
    }));

    const filtered = rows.filter(row => {
      if (tierFilter !== 'all' && row.tier !== tierFilter) return false;
      if (hasUsageOnly && row.usage.central <= 0 && row.usage.own <= 0) return false;
      return true;
    });

    res.json({ users: filtered, config, budgets: Object.fromEntries(budgetByTier), yearMonth });
  } catch (e) { next(e); }
});

adminRouter.get('/config', async (_req, res, next) => {
  try {
    res.json({ config: await getAllGlobalConfig() });
  } catch (e) { next(e); }
});

adminRouter.put('/config', async (req, res, next) => {
  try {
    const { config } = req.body;
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new AppError(400, 'MISSING_FIELDS', 'config object is required.');
    }
    const entries = Object.entries(config);
    if (entries.some(([key, value]) => typeof key !== 'string' || typeof value !== 'string')) {
      throw new AppError(400, 'INVALID_CONFIG', 'All config keys and values must be strings.');
    }
    await Promise.all((entries as [string, string][]).map(([key, value]) => setGlobalConfig(key, value)));
    res.json({ config: await getAllGlobalConfig() });
  } catch (e) { next(e); }
});

adminRouter.get('/ai-providers', async (_req, res, next) => {
  try {
    res.json({ providers: getProviderAvailability() });
  } catch (e) { next(e); }
});

adminRouter.get('/ai-providers/:provider/models', async (req, res, next) => {
  try {
    res.json(await fetchProviderModels(req.params.provider));
  } catch (e) { next(e); }
});

adminRouter.get('/ai-routing', async (_req, res, next) => {
  try {
    res.json(await getAiRoutingAdminPayload());
  } catch (e) { next(e); }
});

adminRouter.put('/ai-routing', async (req, res, next) => {
  try {
    const routing = await saveAiRoutingConfig(req.body.routing);
    res.json({ routing });
  } catch (e) { next(e); }
});
