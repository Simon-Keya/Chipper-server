import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import logger from '../utils/logger';
import prisma from '../utils/prisma';

/**
 * Validation Rules
 */
export const validateRegister = [
  check('username')
    .isLength({ min: 3 })
    .trim()
    .withMessage('Username must be at least 3 characters'),
  check('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  check('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  check('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be user or admin'),
];

export const validateLogin = [
  check('username').notEmpty().withMessage('Username is required'),
  check('password').notEmpty().withMessage('Password is required'),
];

/**
 * Register Controller
 */
export const register = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Registration validation failed', { errors: errors.array() });
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, role = 'user' } = req.body;

  try {
    // Admin limit check
    if (role === 'admin') {
      const adminCount = await prisma.user.count({ where: { role: 'admin' } });
      if (adminCount >= 3) {
        logger.warn('Admin limit exceeded', { username });
        return res.status(400).json({ error: 'Maximum number of admins (3) reached' });
      }
    }

    // Check for existing user
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      const field = existingUser.username === username ? 'Username' : 'Email';
      logger.warn(`${field} already exists`, { username, email });
      return res.status(400).json({ error: `${field} already taken` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role,
      },
    });

    logger.info('User registered successfully', { username, email, role });
    return res.status(201).json({ message: 'Registration successful' });
  } catch (error: unknown) {
    logger.error('Error registering user', { error });
    return res.status(500).json({ error: 'Failed to register user' });
  }
};

/**
 * Login Controller — Fixed to always return JSON
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
      logger.warn('Invalid login attempt - user not found', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      logger.warn('Invalid login attempt - wrong password', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!config.JWT_SECRET) {
      logger.error('JWT_SECRET missing');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info('User logged in successfully', { userId: user.id, username });
    
    // Always return JSON with token
    return res.status(200).json({ token });
  } catch (error: unknown) {
    logger.error('Error during login', { error });
    return res.status(500).json({ error: 'Login failed' });
  }
};