import express from 'express';
import { check } from 'express-validator';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware';
import { rateLimiter } from '../middleware/rateLimitMiddleware';
import { validate } from '../middleware/validateMiddleware';

jest.mock('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(rateLimiter);

app.get('/protected', authMiddleware, (req, res) => res.status(200).json({ message: 'Protected' }));
app.get('/admin', authMiddleware, adminMiddleware, (req, res) => res.status(200).json({ message: 'Admin' }));
app.post('/validate', [check('name').notEmpty()], validate, (req, res) => res.status(200).json({ message: 'Valid' }));

describe('Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should allow access with valid token', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, role: 'user' });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Protected' });
      expect(jwt.verify).toHaveBeenCalledWith('token', expect.any(String));
    });

    it('should reject if no token provided', async () => {
      const response = await request(app).get('/protected');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'No token provided' });
    });

    it('should reject if token is invalid', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid token' });
    });
  });

  describe('adminMiddleware', () => {
    it('should allow access for admin role', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, role: 'admin' });

      const response = await request(app)
        .get('/admin')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Admin' });
    });

    it('should reject non-admin role', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, role: 'user' });

      const response = await request(app)
        .get('/admin')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Admin access required' });
    });
  });

  describe('validateMiddleware', () => {
    it('should pass if validation succeeds', async () => {
      const response = await request(app)
        .post('/validate')
        .send({ name: 'Test' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Valid' });
    });

    it('should fail if validation fails', async () => {
      const response = await request(app)
        .post('/validate')
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ msg: 'name must be a non-empty string' })
      );
    });
  });

  describe('rateLimitMiddleware', () => {
    it('should allow requests under limit', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
    });

    // Note: Testing rate limiting requires multiple requests in quick succession,
    // which is complex to simulate accurately in Jest. This can be tested manually.
  });
});