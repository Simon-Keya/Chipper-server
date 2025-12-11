import { Request, Response, NextFunction } from 'express';
import { Review, ReviewPayload } from '../models/review';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

export const getReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const reviews = await prisma.review.findMany({
      where: { productId: parseInt(productId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    });

    const total = await prisma.review.count({
      where: { productId: parseInt(productId) },
    });

    res.json({
      reviews,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body as ReviewPayload;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if user has purchased the product
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        productId: parseInt(productId),
        order: {
          userId,
          status: 'DELIVERED',
        },
      },
    });

    if (!orderItem) {
      res.status(403).json({ error: 'You can only review products you have purchased' });
      return;
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.review.findFirst({
      where: { productId: parseInt(productId), userId },
    });

    if (existingReview) {
      const updatedReview = await prisma.review.update({
        where: { id: existingReview.id },
        data: { rating, comment },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      });
      res.json(updatedReview);
      return;
    }

    const review = await prisma.review.create({
      data: {
        productId: parseInt(productId),
        userId,
        rating,
        comment,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body as ReviewPayload;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const review = await prisma.review.findFirst({
      where: { id: parseInt(id), userId },
    });

    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    const updatedReview = await prisma.review.update({
      where: { id: parseInt(id) },
      data: { rating, comment },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    res.json(updatedReview);
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const review = await prisma.review.findFirst({
      where: { id: parseInt(id), userId },
    });

    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    await prisma.review.delete({ where: { id: parseInt(id) } });

    res.json({ message: 'Review deleted' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};