import { Request, Response, NextFunction } from 'express';
import { CartItem, CartResponse } from '../models/cart';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    res.json({
      items: cartItems,
      total,
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addToCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if product exists and has stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.stock < quantity) {
      res.status(400).json({ error: 'Product not available' });
      return;
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: { userId, productId },
    });

    let cartItem;
    if (existingItem) {
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          userId,
          productId,
          quantity,
        },
        include: {
          product: true,
        },
      });
    }

    // Update product stock if needed (optional)
    await prisma.product.update({
      where: { id: productId },
      data: { stock: product.stock - quantity },
    });

    res.status(201).json(cartItem);
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCartItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: { id: parseInt(id), userId },
    });

    if (!cartItem) {
      res.status(404).json({ error: 'Cart item not found' });
      return;
    }

    if (quantity < 1) {
      await prisma.cartItem.delete({ where: { id: parseInt(id) } });
      res.json({ message: 'Item removed' });
      return;
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id: parseInt(id) },
      data: { quantity },
      include: { product: true },
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeFromCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: { id: parseInt(id), userId },
    });

    if (!cartItem) {
      res.status(404).json({ error: 'Cart item not found' });
      return;
    }

    await prisma.cartItem.delete({ where: { id: parseInt(id) } });

    res.json({ message: 'Item removed' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const clearCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await prisma.cartItem.deleteMany({
      where: { userId },
    });

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};