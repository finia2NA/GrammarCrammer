import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const defaultAppUrl = process.env.NODE_ENV === 'production'
  ? 'https://patterndeck.richardhanss.de'
  : `http://localhost:${process.env.PORT ?? '3001'}`;

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  jwtSecret: required('JWT_SECRET'),
  encryptionKey: required('ENCRYPTION_KEY'),
  appleClientId: process.env.APPLE_CLIENT_ID ?? '',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  centralApiKey: process.env.CENTRAL_API_KEY || null,
  centralKeyUserMonthlyLimit: parseFloat(process.env.CENTRAL_KEY_USER_MONTHLY_LIMIT ?? '0'),
  centralKeyGlobalMonthlyLimit: parseFloat(process.env.CENTRAL_KEY_GLOBAL_MONTHLY_LIMIT ?? '0'),
  resendApiKey: process.env.RESEND_API_KEY || null,
  appUrl: process.env.APP_URL || defaultAppUrl,
  emailFrom: process.env.EMAIL_FROM || 'Pattern Deck <noreply@patterndeck.richardhanss.de>',
  posthogProjectApiKey: process.env.POSTHOG_PROJECT_API_KEY || null,
  posthogHost: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
  posthogEnabled: process.env.POSTHOG_ENABLED !== '0' && !!process.env.POSTHOG_PROJECT_API_KEY,
} as const;

export function isCentralKeyAvailable(): boolean {
  return config.centralApiKey != null;
}
