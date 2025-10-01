import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import logger from '../utils/logger';

interface JwtPayload {
  userId: number;
  role: string;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    logger.warn('No token provided');
    // Corrected: Added 'return' to explicitly exit this code path.
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    (req as any).user = decoded;
    next();
  } catch (error) {
    logger.error('Invalid token', { error });
    // Corrected: Added 'return' to explicitly exit this code path.
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user as JwtPayload;
  if (user.role !== 'admin') {
    logger.warn(`Unauthorized access attempt by user ${user.userId}`);
    // Corrected: Added 'return' to explicitly exit this code path.
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};