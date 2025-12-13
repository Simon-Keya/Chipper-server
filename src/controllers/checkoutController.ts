// src/controllers/checkoutController.ts

import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { processPayment } from '../utils/payment';

export const createCheckout = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { shippingAddress, paymentMethod } = req.body;

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty' });
    }

    const total = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    const order = await prisma.order.create({
      data: {
        userId,
        total,
        status: 'PENDING',
        paymentMethod,
        paymentStatus: 'PENDING',
        shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : null,
      },
    });

    await prisma.orderItem.createMany({
      data: cartItems.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.product.price,
      })),
    });

    await prisma.cartItem.deleteMany({ where: { userId } });

    let paymentResult: 'COMPLETED' | 'PENDING' | 'FAILED' = 'PENDING';

    if (paymentMethod === 'CARD') {
      paymentResult = await processPayment(total, 'CARD', order.id);
    } else if (paymentMethod === 'MPESA') {
      paymentResult = await processPayment(total, 'MPESA', order.id);
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: paymentResult,
        status: paymentResult === 'COMPLETED' ? 'PROCESSING' : 'PENDING',
      },
    });

    const finalOrder = await prisma.order.findUnique({
      where: { id: order.id },
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
    });

    res.json({
      success: true,
      order: finalOrder,
      paymentStatus: paymentResult,
    });
  } catch (error) {
    console.error('Checkout failed:', error);
    res.status(500).json({ error: 'Checkout failed. Please try again.' });
  }
};

export const getCheckout = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.userId;

    const order = await prisma.order.findFirst({
      where: {
        id: Number(orderId),
        ...(userId ? { userId } : {}),
      },
      include: {
        orderItems: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
        user: {
          select: { username: true, email: true },
        },
      },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};