// src/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import logger from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;   // ← Must be userId, not id
        role: string;
      };
    }
  }
}
/**
 * Authenticate JWT token
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('No token provided', { path: req.path });
    return res.status(401).json({ error: 'Access token required' });
  }

  const token = authHeader.split(' ')[1];

  if (!config.JWT_SECRET) {
    logger.error('JWT_SECRET is missing in environment');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    if (err) {
      logger.warn('Invalid or expired token', { error: err.message });
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Now req.user is properly typed everywhere!
    req.user = decoded as JwtPayload;
    next();
  });
};

/**
 * Admin-only middleware
 */
export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== 'admin') {
    logger.warn('Admin access denied', {
      userId: req.user?.userId,
      role: req.user?.role,
      path: req.path,
    });
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

// Optional: Keep backward compatibility
export { authenticateToken as authMiddleware };