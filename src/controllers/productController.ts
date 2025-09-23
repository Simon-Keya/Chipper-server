import { PrismaClient } from '@prisma/client';
import type { Request, Response } from 'express';
import { check } from 'express-validator';
import type { Socket } from 'socket.io';
import { validate } from '../middleware/validateMiddleware.js';
import { uploadImage } from '../utils/cloudinary.js';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

export const validateProduct = [
  check('name').isLength({ min: 3 }).trim().withMessage('Name must be at least 3 characters'),
  check('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  check('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  check('categoryId').isInt({ min: 1 }).withMessage('Valid categoryId required'),
  check('description').isLength({ min: 10 }).trim().withMessage('Description must be at least 10 characters'),
  check('image').notEmpty().withMessage('Image is required'),
  validate,
];

export const getProducts = async (req: Request, res: Response) => {
  try {
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const products = await prisma.product.findMany({
      where: categoryId ? { categoryId } : {},
      include: { category: true },
    });
    logger.info('Fetched products', { categoryId, count: products.length });
    res.json(products);
  } catch (error: unknown) {
    logger.error('Error fetching products', { error });
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const createProduct = async (req: Request, res: Response, socket: Socket) => {
  try {
    const { name, price, stock, categoryId, description, image } = req.body;
    const imageUrl = await uploadImage(image);
    const product = await prisma.product.create({
      data: {
        name,
        price: parseFloat(price),
        stock: parseInt(stock),
        categoryId: parseInt(categoryId),
        description,
        imageUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: { category: true },
    });
    logger.info('Product created', { productId: product.id, name });
    socket.emit('new-product', product);
    res.status(201).json(product);
  } catch (error: unknown) {
    logger.error('Error creating product', { error });
    res.status(400).json({ error: 'Failed to create product' });
  }
};

export const updateProduct = async (req: Request, res: Response, socket: Socket) => {
  try {
    const id = parseInt(req.params.id as string); // Add 'as string' to resolve the type error
    const { name, price, stock, categoryId, description, image } = req.body;
    const imageUrl = image ? await uploadImage(image) : undefined;
    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        price: parseFloat(price),
        stock: parseInt(stock),
        categoryId: parseInt(categoryId),
        description,
        imageUrl: imageUrl || undefined,
        updatedAt: new Date(),
      },
      include: { category: true },
    });
    logger.info('Product updated', { productId: id, name });
    socket.emit('update-product', product);
    res.json(product);
  } catch (error: unknown) {
    logger.error('Error updating product', { error });
    res.status(400).json({ error: 'Failed to update product' });
  }
};

export const deleteProduct = async (req: Request, res: Response, socket: Socket) => {
  try {
    const id = parseInt(req.params.id as string); // Add 'as string' to resolve the type error
    await prisma.product.delete({ where: { id } });
    logger.info('Product deleted', { productId: id });
    socket.emit('delete-product', { id });
    res.status(204).send();
  } catch (error: unknown) {
    logger.error('Error deleting product', { error });
    res.status(400).json({ error: 'Failed to delete product' });
  }
};