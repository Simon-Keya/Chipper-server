import { NextFunction, Request, Response } from 'express';
import logger from '../utils/logger';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  logger.error('Server error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
};