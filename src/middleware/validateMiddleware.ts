import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import logger from '../utils/logger';

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', { errors: errors.array() });
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};