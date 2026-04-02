import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.service.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from './errorHandler.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header.');
    }

    const token = header.slice(7);
    const { userId } = verifyToken(token);
    req.userId = userId;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    req.userEmail = user?.email ?? userId;

    next();
  } catch (e) {
    next(e);
  }
}
