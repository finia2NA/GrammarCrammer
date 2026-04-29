import { prisma } from '../lib/prisma.js';
import { SETTING_DEFAULTS } from '@grammarcrammer/shared';

export async function getAllSettings(userId: string): Promise<Record<string, string>> {
  const settings = await prisma.setting.findMany({
    where: { userId },
    select: { key: true, value: true },
  });
  return {
    ...SETTING_DEFAULTS,
    ...Object.fromEntries(settings.map(setting => [setting.key, setting.value])),
  };
}

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

export async function setSettings(userId: string, settings: Record<string, string>): Promise<void> {
  await prisma.$transaction(
    Object.entries(settings).map(([key, value]) => prisma.setting.upsert({
      where: { userId_key: { userId, key } },
      update: { value },
      create: { userId, key, value },
    })),
  );
}
