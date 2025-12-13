// src/controllers/orderController.ts

import { Request, Response } from 'express';
import logger from '../utils/logger';
import prisma from '../utils/prisma';

export const getOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        orderItems: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
        user: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    logger.info('Fetched orders', { count: orders.length });
    res.json(orders);
  } catch (error) {
    logger.error('Error fetching orders', { error });
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Note: Direct order creation with productId is not supported in your schema
// Orders are created through checkout with cart items → orderItems
// If you need a simple order endpoint, use orderItems instead
// Or remove this function if checkout handles all orders

// Example (optional — if you really need direct order creation):
/*
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const total = product.price * quantity;

    const order = await prisma.order.create({
      data: {
        userId,
        total,
        status: 'PENDING',
        paymentMethod: 'CARD',
        paymentStatus: 'PENDING',
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: Number(productId),
        quantity,
        priceAtPurchase: product.price,
      },
    });

    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        orderItems: { include: { product: { include: { category: true } } } },
        user: { select: { username: true } },
      },
    });

    res.status(201).json(fullOrder);
  } catch (error) {
    logger.error('Error creating order', { error });
    res.status(500).json({ error: 'Failed to create order' });
  }
};
*/