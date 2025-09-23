import { PrismaClient } from '@prisma/client';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import request from 'supertest';
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware';
import { errorMiddleware } from '../middleware/errorMiddleware';
import { categoryRouter } from '../routes/categoryRoutes';

jest.mock('@prisma/client');
jest.mock('jsonwebtoken');
jest.mock('../middleware/authMiddleware');

const prismaMock = new PrismaClient() as jest.Mocked<PrismaClient>;
const ioMock = new Server();
const app = express();
app.use(express.json());
app.use('/api/categories', categoryRouter(ioMock));
app.use(errorMiddleware);

describe('Category Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authMiddleware as jest.Mock).mockImplementation((req, res, next) => {
      (req as any).user = { userId: 1, role: 'admin' };
      next();
    });
    (adminMiddleware as jest.Mock).mockImplementation((req, res, next) => next());
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, role: 'admin' });
  });

  describe('GET /api/categories', () => {
    it('should fetch all categories', async () => {
      const categories = [
        { id: 1, name: 'Electronics', createdAt: new Date(), updatedAt: new Date() },
        { id: 2, name: 'Books', createdAt: new Date(), updatedAt: new Date() },
      ];
      prismaMock.category.findMany.mockResolvedValue(categories);

      const response = await request(app).get('/api/categories');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(categories);
      expect(prismaMock.category.findMany).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      prismaMock.category.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/categories');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch categories' });
    });
  });

  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
      const category = { id: 1, name: 'Electronics', createdAt: new Date(), updatedAt: new Date() };
      prismaMock.category.create.mockResolvedValue(category);
      ioMock.emit = jest.fn();

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', 'Bearer token')
        .send({ name: 'Electronics' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(category);
      expect(prismaMock.category.create).toHaveBeenCalledWith({
        data: { name: 'Electronics', createdAt: expect.any(Date), updatedAt: expect.any(Date) },
      });
      expect(ioMock.emit).toHaveBeenCalledWith('new-category', category);
    });

    it('should fail if validation fails', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', 'Bearer token')
        .send({ name: 'ab' });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ msg: 'Name must be at least 3 characters' })
      );
    });

    it('should fail if not admin', async () => {
      (adminMiddleware as jest.Mock).mockImplementation((req, res) => {
        res.status(403).json({ error: 'Admin access required' });
      });

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', 'Bearer token')
        .send({ name: 'Electronics' });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Admin access required' });
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('should update a category', async () => {
      const category = { id: 1, name: 'Updated Electronics', createdAt: new Date(), updatedAt: new Date() };
      prismaMock.category.update.mockResolvedValue(category);
      ioMock.emit = jest.fn();

      const response = await request(app)
        .put('/api/categories/1')
        .set('Authorization', 'Bearer token')
        .send({ name: 'Updated Electronics' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(category);
      expect(prismaMock.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated Electronics', updatedAt: expect.any(Date) },
      });
      expect(ioMock.emit).toHaveBeenCalledWith('update-category', category);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete a category', async () => {
      prismaMock.category.delete.mockResolvedValue({ id: 1, name: 'Electronics', createdAt: new Date(), updatedAt: new Date() });
      ioMock.emit = jest.fn();

      const response = await request(app)
        .delete('/api/categories/1')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(204);
      expect(prismaMock.category.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(ioMock.emit).toHaveBeenCalledWith('delete-category', { id: 1 });
    });
  });
});