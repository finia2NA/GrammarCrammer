import { config } from '../config.js';

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!config.resendApiKey) {
    console.log(`[email] Password reset URL for ${to}: ${resetUrl}`);
    return;
  }

  const { Resend } = await import('resend');
  const resend = new Resend(config.resendApiKey);

  await resend.emails.send({
    from: config.emailFrom,
    to,
    subject: 'Reset your GrammarCrammer password',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 16px;">Reset your password</h2>
        <p style="color: #555; line-height: 1.6; margin-bottom: 24px;">
          You requested a password reset for your GrammarCrammer account. Click the button below to choose a new password. This link expires in 5 minutes.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #E8720C; color: #FDF0E0; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
          Reset Password
        </a>
        <p style="color: #999; font-size: 13px; margin-top: 32px; line-height: 1.5;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
