import prisma from '../utils/prisma';
import { Request, Response } from 'express';
import { check } from 'express-validator';
import { validate } from '../middleware/validateMiddleware';
import logger from '../utils/logger';

export const validateOrder = [
  check('productId').isInt({ min: 1 }).withMessage('Valid productId required'),
  check('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  validate,
];

export const getOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: { product: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
    logger.info('Fetched orders', { count: orders.length });
    res.json(orders);
  } catch (error: unknown) {
    logger.error('Error fetching orders', { error });
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { productId, quantity } = req.body;

    const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
    if (!product) {
      logger.warn('Invalid productId for order', { productId });
      return res.status(400).json({ error: 'Invalid productId' });
    }

    const order = await prisma.order.create({
      data: {
        productId: Number(productId),
        quantity: Number(quantity),
        total: product.price * Number(quantity),
      },
      include: { product: { include: { category: true } } },
    });

    logger.info('Order created', { orderId: order.id, productId });
    res.status(201).json(order);
  } catch (error: unknown) {
    logger.error('Error creating order', { error });
    res.status(400).json({ error: 'Failed to create order' });
  }
};
