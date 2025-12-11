import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authMiddleware';
import { processPayment } from '../utils/payment';

const prisma = new PrismaClient();

export const createCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { shippingAddress, paymentMethod } = req.body;

    // Get user's cart items
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: true,
      },
    });

    if (cartItems.length === 0) {
      res.status(400).json({ error: 'Cart is empty' });
      return;
    }

    // Calculate total
    const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    // Create order
    const order = await prisma.order.create({
      data: {
        userId,
        total,
        status: 'PENDING',
        paymentMethod,
        paymentStatus: 'PENDING',
        shippingAddress,
      },
      include: {
        user: true,
      },
    });

    // Create order items
    const orderItems = await prisma.orderItem.createMany({
      data: cartItems.map(item => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
      })),
    });

    // Clear cart
    await prisma.cartItem.deleteMany({
      where: { userId },
    });

    // Process payment (stub - integrate with Stripe/M-Pesa)
    let paymentStatus = 'PENDING';
    if (paymentMethod === 'CARD') {
      paymentStatus = await processPayment(total, 'card', order.id);
    } else if (paymentMethod === 'MPESA') {
      paymentStatus = await processPayment(total, 'mpesa', order.id);
    }

    // Update order payment status
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus },
    });

    if (paymentStatus === 'COMPLETED') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'PROCESSING' },
      });
    }

    res.json({
      order,
      orderItems,
      paymentStatus,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (error) {
    console.error('Get checkout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};