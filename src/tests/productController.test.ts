import { PrismaClient } from '@prisma/client';
import express from 'express';
import jwt from 'jsonwebtoken';
// Removed the 'Server' import as it's no longer used, addressing the TS6133 error.
import request from 'supertest';
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware';
import { errorMiddleware } from '../middleware/errorMiddleware';
import { productRouter } from '../routes/productRoutes';
import { uploadImage } from '../utils/cloudinary';

jest.mock('@prisma/client');
jest.mock('../utils/cloudinary');
jest.mock('jsonwebtoken');
jest.mock('../middleware/authMiddleware');

const prismaMock = new PrismaClient() as jest.Mocked<PrismaClient>;

// Corrected: Use 'as any' to bypass the strict type check,
// allowing the simple mock object to be used where a Socket is expected.
const ioMock = {
    emit: jest.fn(),
} as any;

const app = express();
app.use(express.json());
app.use('/api/products', productRouter(ioMock));
app.use(errorMiddleware);

describe('Product Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
      (req as any).user = { userId: 1, role: 'admin' };
      next();
    });
    (adminMiddleware as jest.Mock).mockImplementation((_req, _res, next) => next());
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, role: 'admin' });
    (uploadImage as jest.Mock).mockResolvedValue('http://cloudinary.com/image.jpg');
  });

  describe('GET /api/products', () => {
    it('should fetch all products', async () => {
      const products = [
        {
          id: 1,
          name: 'Product',
          price: 19.99,
          stock: 10,
          categoryId: 1,
          description: 'Test product',
          imageUrl: 'http://cloudinary.com/image.jpg',
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { id: 1, name: 'Category' },
        },
      ];
      prismaMock.product.findMany.mockResolvedValue(products);

      const response = await request(app).get('/api/products');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(products);
      expect(prismaMock.product.findMany).toHaveBeenCalledWith({
        where: {},
        include: { category: true },
      });
    });

    it('should fetch products by categoryId', async () => {
      const products = [
        {
          id: 1,
          name: 'Product',
          price: 19.99,
          stock: 10,
          categoryId: 1,
          description: 'Test product',
          imageUrl: 'http://cloudinary.com/image.jpg',
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { id: 1, name: 'Category' },
        },
      ];
      prismaMock.product.findMany.mockResolvedValue(products);

      const response = await request(app).get('/api/products?categoryId=1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(products);
      expect(prismaMock.product.findMany).toHaveBeenCalledWith({
        where: { categoryId: 1 },
        include: { category: true },
      });
    });

    it('should handle errors', async () => {
      prismaMock.product.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/products');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch products' });
    });
  });

  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const product = {
        id: 1,
        name: 'Product',
        price: 19.99,
        stock: 10,
        categoryId: 1,
        description: 'Test product',
        imageUrl: 'http://cloudinary.com/image.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: { id: 1, name: 'Category' },
      };
      prismaMock.product.create.mockResolvedValue(product);
      (ioMock.emit as jest.Mock) = jest.fn();

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', 'Bearer token')
        .send({
          name: 'Product',
          price: 19.99,
          stock: 10,
          categoryId: 1,
          description: 'Test product',
          image: 'data:image/jpeg;base64,/9j/...',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(product);
      expect(uploadImage).toHaveBeenCalledWith('data:image/jpeg;base64,/9j/...');
      expect(prismaMock.product.create).toHaveBeenCalledWith({
        data: {
          name: 'Product',
          price: 19.99,
          stock: 10,
          categoryId: 1,
          description: 'Test product',
          imageUrl: 'http://cloudinary.com/image.jpg',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        include: { category: true },
      });
      expect(ioMock.emit).toHaveBeenCalledWith('new-product', product);
    });

    it('should fail if validation fails', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', 'Bearer token')
        .send({
          name: 'ab',
          price: -1,
          stock: -1,
          categoryId: 0,
          description: 'short',
          image: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ msg: 'Name must be at least 3 characters' })
      );
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ msg: 'Price must be a positive number' })
      );
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ msg: 'Stock must be a non-negative integer' })
      );
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ msg: 'Valid categoryId required' })
      );
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ msg: 'Description must be at least 10 characters' })
      );
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ msg: 'Image is required' })
      );
    });

    it('should fail if not admin', async () => {
      (adminMiddleware as jest.Mock).mockImplementation((_req, res) => {
        res.status(403).json({ error: 'Admin access required' });
      });

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', 'Bearer token')
        .send({
          name: 'Product',
          price: 19.99,
          stock: 10,
          categoryId: 1,
          description: 'Test product',
          image: 'data:image/jpeg;base64,/9j/...',
        });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Admin access required' });
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update a product', async () => {
      const product = {
        id: 1,
        name: 'Updated Product',
        price: 29.99,
        stock: 20,
        categoryId: 1,
        description: 'Updated description',
        imageUrl: 'http://cloudinary.com/image.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: { id: 1, name: 'Category' },
      };
      prismaMock.product.update.mockResolvedValue(product);
      (ioMock.emit as jest.Mock) = jest.fn();

      const response = await request(app)
        .put('/api/products/1')
        .set('Authorization', 'Bearer token')
        .send({
          name: 'Updated Product',
          price: 29.99,
          stock: 20,
          categoryId: 1,
          description: 'Updated description',
          image: 'data:image/jpeg;base64,/9j/...',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(product);
      expect(uploadImage).toHaveBeenCalledWith('data:image/jpeg;base64,/9j/...');
      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: 'Updated Product',
          price: 29.99,
          stock: 20,
          categoryId: 1,
          description: 'Updated description',
          imageUrl: 'http://cloudinary.com/image.jpg',
          updatedAt: expect.any(Date),
        },
        include: { category: true },
      });
      expect(ioMock.emit).toHaveBeenCalledWith('update-product', product);
    });

    it('should update product without image', async () => {
      const product = {
        id: 1,
        name: 'Updated Product',
        price: 29.99,
        stock: 20,
        categoryId: 1,
        description: 'Updated description',
        imageUrl: 'http://cloudinary.com/old.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: { id: 1, name: 'Category' },
      };
      prismaMock.product.update.mockResolvedValue(product);
      (ioMock.emit as jest.Mock) = jest.fn();

      const response = await request(app)
        .put('/api/products/1')
        .set('Authorization', 'Bearer token')
        .send({
          name: 'Updated Product',
          price: 29.99,
          stock: 20,
          categoryId: 1,
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(product);
      expect(uploadImage).not.toHaveBeenCalled();
      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: 'Updated Product',
          price: 29.99,
          stock: 20,
          categoryId: 1,
          description: 'Updated description',
          updatedAt: expect.any(Date),
        },
        include: { category: true },
      });
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete a product', async () => {
      prismaMock.product.delete.mockResolvedValue({
        id: 1,
        name: 'Product',
        price: 19.99,
        stock: 10,
        categoryId: 1,
        description: 'Test product',
        imageUrl: 'http://cloudinary.com/image.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (ioMock.emit as jest.Mock) = jest.fn();

      const response = await request(app)
        .delete('/api/products/1')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(204);
      expect(prismaMock.product.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(ioMock.emit).toHaveBeenCalledWith('delete-product', { id: 1 });
    });
  });
});