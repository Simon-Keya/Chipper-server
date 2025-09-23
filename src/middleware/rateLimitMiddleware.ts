import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per window
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP ${req.ip}`);
    res.status(429).json({ error: 'Too many requests, please try again later' });
  },
});