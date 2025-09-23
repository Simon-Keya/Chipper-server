import { PrismaClient } from '@prisma/client';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { authMiddleware } from '../middleware/authMiddleware';
import { errorMiddleware } from '../middleware/errorMiddleware';
import { orderRouter } from '../routes/orderRoutes';

jest.mock('@prisma/client');
jest.mock('jsonwebtoken');
jest.mock('../middleware/authMiddleware');

const prismaMock = new PrismaClient() as jest.Mocked<PrismaClient>;
const app = express();
app.use(express.json());
app.use('/api/orders', orderRouter());
app.use(errorMiddleware);

describe('Order Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authMiddleware as jest.Mock).mockImplementation((req, res, next) => {
      (req as any).user = { userId: 1, role: 'user' };
      next();
    });
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, role: 'user' });
  });

  describe('GET /api/orders', () => {
    it('should fetch all orders', async () => {
      const orders = [
        {
          id: 1,
          productId: 1,
          quantity: 2,
          total: 39.98,
          createdAt: new Date(),
          product: { id: 1, name: 'Product', price: 19.99, category: { id: 1, name: 'Category' } },
        },
      ];
      prismaMock.order.findMany.mockResolvedValue(orders);

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(orders);
      expect(prismaMock.order.findMany).toHaveBeenCalledWith({
        include: { product: { include: { category: true } } },
      });
    });

    it('should handle errors', async () => {
      prismaMock.order.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch orders' });
    });
  });

  describe('POST /api/orders', () => {
    it('should create a new order', async () => {
      const product = { id: 1, name: 'Product', price: 19.99, stock: 10, categoryId: 1 };
      const order = {
        id: 1,
        productId: 1,
        quantity: 2,
        total: 39.98,
        createdAt: new Date(),
        product: { id: 1, name: 'Product', price: 19.99, category: { id: 1, name: 'Category' } },
      };
      prismaMock.product.findUnique.mockResolvedValue(product);
      prismaMock.order.create.mockResolvedValue(order);

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', 'Bearer token')
        .send({ productId: 1, quantity: 2 });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(order);
      expect(prismaMock.order.create).toHaveBeenCalledWith({
        data: {
          productId: 1,
          quantity: 2,
          total: 39.98,
          createdAt: expect.any(Date),
        },
        include: { product: { include: { category: true } } },
      });
    });

    it('should fail if productId is invalid', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', 'Bearer token')
        .send({ productId: 999, quantity: 2 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid productId' });
    });

    it('should fail if validation fails', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', 'Bearer token')
        .send({ productId: 0, quantity: 0 });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ msg: 'Valid productId required' })
      );
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ msg: 'Quantity must be a positive integer' })
      );
    });
  });
});