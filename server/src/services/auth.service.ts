import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config, isCentralKeyAvailable } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

const JWT_EXPIRY = '7d';

export function signToken(userId: string): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): { userId: string } {
  try {
    return jwt.verify(token, config.jwtSecret) as { userId: string };
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired token.');
  }
}

export async function register(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash },
  });

  return { token: signToken(user.id), user: { id: user.id, email: user.email } };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');

  return { token: signToken(user.id), user: { id: user.id, email: user.email } };
}

export async function findOrCreateByApple(appleId: string, email: string | null) {
  // Try to find by appleId first
  let user = await prisma.user.findUnique({ where: { appleId } });
  if (user) return { token: signToken(user.id), user: { id: user.id, email: user.email } };

  // Try to link to existing account by email
  if (email) {
    user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      user = await prisma.user.update({ where: { id: user.id }, data: { appleId } });
      return { token: signToken(user.id), user: { id: user.id, email: user.email } };
    }
  }

  // Create new user
  user = await prisma.user.create({ data: { appleId, email } });
  return { token: signToken(user.id), user: { id: user.id, email: user.email } };
}

export async function findOrCreateByGoogle(googleId: string, email: string | null) {
  let user = await prisma.user.findUnique({ where: { googleId } });
  if (user) return { token: signToken(user.id), user: { id: user.id, email: user.email } };

  if (email) {
    user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId } });
      return { token: signToken(user.id), user: { id: user.id, email: user.email } };
    }
  }

  user = await prisma.user.create({ data: { googleId, email } });
  return { token: signToken(user.id), user: { id: user.id, email: user.email } };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found.');

  const authMethods: string[] = [];
  if (user.passwordHash) authMethods.push('email');
  if (user.appleId) authMethods.push('apple');
  if (user.googleId) authMethods.push('google');

  return {
    id: user.id,
    email: user.email,
    hasApiKey: !!user.claudeApiKey,
    centralKeyAvailable: isCentralKeyAvailable(),
    authMethods,
  };
}
