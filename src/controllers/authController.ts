import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import logger from '../utils/logger';

const prisma = new PrismaClient();

/**
 * ✅ Validators
 */
export const validateRegister = [
  check('username')
    .isLength({ min: 3 })
    .trim()
    .withMessage('Username must be at least 3 characters'),
  check('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  check('role')
    .isIn(['user', 'admin'])
    .withMessage('Role must be user or admin'),
];

export const validateLogin = [
  check('username').notEmpty().withMessage('Username is required'),
  check('password').notEmpty().withMessage('Password is required'),
];

/**
 * ✅ Register Controller
 * Matches frontend: expects username, password, role
 * Returns only a message on success
 */
export const register = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Registration validation failed', { errors: errors.array() });
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, role } = req.body;

  try {
    if (role === 'admin') {
      const adminCount = await prisma.user.count({ where: { role: 'admin' } });
      if (adminCount >= 3) {
        logger.warn('Admin limit exceeded', { username });
        return res.status(400).json({ error: 'Maximum number of admins (3) reached' });
      }
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      logger.warn('Username already exists', { username });
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    logger.info('User registered successfully', { username });
    return res.status(201).json({ message: 'Registration successful' });
  } catch (error: unknown) {
    logger.error('Error registering user', { error });
    return res.status(500).json({ error: 'Failed to register user' });
  }
};

/**
 * ✅ Login Controller
 * Matches frontend: returns { token }
 */
export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Login validation failed', { errors: errors.array() });
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      logger.warn('Invalid login attempt - no user', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      logger.warn('Invalid login attempt - wrong password', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 🔐 JWT Secret safety check
    if (!config.JWT_SECRET) {
      logger.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    logger.info('User logged in successfully', { userId: user.id, username });
    return res.json({ token });
  } catch (error: unknown) {
    logger.error('Error logging in', { error });
    return res.status(500).json({ error: 'Failed to log in' });
  }
};
