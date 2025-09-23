import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { errorMiddleware } from '../middleware/errorMiddleware';
import { authRouter } from '../routes/authRoutes';
import { config } from '../utils/config';

jest.mock('@prisma/client');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const prismaMock = new PrismaClient() as jest.Mocked<PrismaClient>;
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter());
app.use(errorMiddleware);

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.count.mockResolvedValue(0);
      prismaMock.user.create.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: 'hashed',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      (jwt.sign as jest.Mock).mockReturnValue('token');

      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'password123', role: 'user' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ token: 'token' });
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          username: 'testuser',
          password: 'hashed',
          role: 'user',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should fail if username already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: 'hashed',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'password123', role: 'user' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Username already exists' });
    });

    it('should fail if admin limit (3) is exceeded', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.count.mockResolvedValue(3);

      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'admin4', password: 'password123', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Maximum number of admins (3) reached' });
    });

    it('should fail if validation fails', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'te', password: 'pass', role: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ msg: 'Username must be at least 3 characters' })
      );
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ msg: 'Password must be at least 6 characters' })
      );
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ msg: 'Role must be user or admin' })
      );
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: 'hashed',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ token: 'token' });
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 1, role: 'user' },
        config.jwtSecret,
        { expiresIn: '1h' }
      );
    });

    it('should fail if username does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid credentials' });
    });

    it('should fail if password is incorrect', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: 'hashed',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid credentials' });
    });

    it('should fail if validation fails', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: '', password: '' });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ msg: 'Username is required' })
      );
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ msg: 'Password is required' })
      );
    });
  });
});