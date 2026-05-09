import { prisma } from '../lib/prisma.js';

const DEFAULT_USER_BUDGETS = {
  free: 1.00,
  paid: 5.00,
} as const;

export async function getGlobalConfig(key: string): Promise<string | null> {
  const config = await prisma.globalConfig.findUnique({ where: { key } });
  return config?.value ?? null;
}

export async function setGlobalConfig(key: string, value: string): Promise<void> {
  await prisma.globalConfig.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getAllGlobalConfig(): Promise<Record<string, string>> {
  const rows = await prisma.globalConfig.findMany();
  return Object.fromEntries(rows.map(row => [row.key, row.value]));
}

export async function getUserBudget(tier: 'free' | 'paid'): Promise<number> {
  const key = tier === 'paid' ? 'paid_user_budget' : 'free_user_budget';
  const raw = await getGlobalConfig(key);
  const parsed = raw == null ? Number.NaN : Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_USER_BUDGETS[tier];
}
