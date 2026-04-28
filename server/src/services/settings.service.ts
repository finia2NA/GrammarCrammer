import { prisma } from '../lib/prisma.js';
import { SETTING_DEFAULTS } from '@grammarcrammer/shared';

export async function getSetting(userId: string, key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({
    where: { userId_key: { userId, key } },
  });
  return setting?.value ?? SETTING_DEFAULTS[key] ?? null;
}

export async function setSetting(userId: string, key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { userId_key: { userId, key } },
    update: { value },
    create: { userId, key, value },
  });
}
