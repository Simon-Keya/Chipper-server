import prisma from '../utils/prisma';
import type { Request, Response } from 'express';
import { check } from 'express-validator';
import type { Server } from 'socket.io';
import { validate } from '../middleware/validateMiddleware';
import { uploadImage } from '../utils/cloudinary';
import logger from '../utils/logger';

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
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const products = await prisma.product.findMany({
      where: categoryId ? { categoryId } : {},
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    logger.info('Fetched products', { categoryId, count: products.length });
    res.json(products);
  } catch (error: unknown) {
    logger.error('Error fetching products', { error });
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const createProduct = async (req: Request, res: Response, socket: Server) => {
  try {
    const { name, price, stock, categoryId, description, image } = req.body;

    const imageUrl = await uploadImage(image);

    const product = await prisma.product.create({
      data: {
        name,
        price: parseFloat(price),
        stock: Number(stock),
        categoryId: Number(categoryId),
        description,
        imageUrl,
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

export const updateProduct = async (req: Request, res: Response, socket: Server) => {
  try {
    const id = Number(req.params.id);
    const { name, price, stock, categoryId, description, image } = req.body;

    const updateData: any = {
      name,
      price: parseFloat(price),
      stock: Number(stock),
      categoryId: Number(categoryId),
      description,
    };

    if (image) {
      updateData.imageUrl = await uploadImage(image);
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
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

export const deleteProduct = async (req: Request, res: Response, socket: Server) => {
  try {
    const id = Number(req.params.id);
    await prisma.product.delete({ where: { id } });
    logger.info('Product deleted', { productId: id });
    socket.emit('delete-product', { id });
    res.status(204).send();
  } catch (error: unknown) {
    logger.error('Error deleting product', { error });
    res.status(400).json({ error: 'Failed to delete product' });
  }
};
