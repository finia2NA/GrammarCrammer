import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

export function currentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function recordUsage(
  userId: string,
  source: 'central' | 'own',
  endpoint: string,
  model: string,
  cost: number,
): Promise<void> {
  const yearMonth = currentYearMonth();

  await prisma.$transaction([
    prisma.usageLedger.create({
      data: { userId, yearMonth, source, endpoint, model, cost },
    }),
    prisma.monthlyUsageSummary.upsert({
      where: { userId_yearMonth_source: { userId, yearMonth, source } },
      create: { userId, yearMonth, source, totalCost: cost },
      update: { totalCost: { increment: cost } },
    }),
  ]);
}

export async function getUserMonthlyUsage(
  userId: string,
  yearMonth?: string,
): Promise<{ central: number; own: number }> {
  const ym = yearMonth ?? currentYearMonth();

  const rows = await prisma.monthlyUsageSummary.findMany({
    where: { userId, yearMonth: ym },
    select: { source: true, totalCost: true },
  });

  let central = 0;
  let own = 0;
  for (const r of rows) {
    if (r.source === 'central') central = r.totalCost;
    else if (r.source === 'own') own = r.totalCost;
  }
  return { central, own };
}

export async function getGlobalCentralUsage(yearMonth?: string): Promise<number> {
  const ym = yearMonth ?? currentYearMonth();

  const result = await prisma.monthlyUsageSummary.aggregate({
    where: { yearMonth: ym, source: 'central' },
    _sum: { totalCost: true },
  });

  return result._sum.totalCost ?? 0;
}

export async function canUseCentralKey(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  userUsage: number;
  userLimit: number;
  globalUsage: number;
  globalLimit: number;
}> {
  const userLimit = config.centralKeyUserMonthlyLimit;
  const globalLimit = config.centralKeyGlobalMonthlyLimit;

  const [userUsageData, globalUsage] = await Promise.all([
    getUserMonthlyUsage(userId),
    getGlobalCentralUsage(),
  ]);

  const userUsage = userUsageData.central;

  if (globalLimit > 0 && globalUsage >= globalLimit) {
    return {
      allowed: false,
      reason: 'Global usage limit reached. Please use your own API key.',
      userUsage, userLimit, globalUsage, globalLimit,
    };
  }

  if (userLimit > 0 && userUsage >= userLimit) {
    return {
      allowed: false,
      reason: 'Your monthly server key usage limit has been reached. Please use your own API key.',
      userUsage, userLimit, globalUsage, globalLimit,
    };
  }

  return { allowed: true, userUsage, userLimit, globalUsage, globalLimit };
}
