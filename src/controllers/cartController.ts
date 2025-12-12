// src/controllers/cartController.ts

import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: { category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    res.json({ items: cartItems, total });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
};

export const addToCart = async (req: Request, res: Response) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    const existing = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    let cartItem;
    if (existing) {
      cartItem = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
        include: { product: true },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: { userId, productId, quantity },
        include: { product: true },
      });
    }

    // Reduce stock
    await prisma.product.update({
      where: { id: productId },
      data: { stock: product.stock - quantity },
    });

    res.status(201).json(cartItem);
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
};

export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const cartItem = await prisma.cartItem.findFirst({
      where: { id: Number(id), userId },
      include: { product: true },
    });

    if (!cartItem) return res.status(404).json({ error: 'Item not found' });

    if (quantity < 1) {
      await prisma.cartItem.delete({ where: { id: Number(id) } });
      return res.json({ message: 'Item removed' });
    }

    const updated = await prisma.cartItem.update({
      where: { id: Number(id) },
      data: { quantity },
      include: { product: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: 'Failed to update cart' });
  }
};

export const removeFromCart = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const cartItem = await prisma.cartItem.findFirst({
      where: { id: Number(id), userId },
    });

    if (!cartItem) return res.status(404).json({ error: 'Item not found' });

    await prisma.cartItem.delete({ where: { id: Number(id) } });
    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Failed to remove item' });
  }
};

export const clearCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.cartItem.deleteMany({ where: { userId } });
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
};