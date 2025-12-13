// src/controllers/reviewController.ts

import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getReviews = async (req: Request, res: Response) => {
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
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const total = await prisma.review.count({
      where: { productId: parseInt(productId) },
    });

    res.json({
      reviews,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createReview = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.userId;  // ← Fixed: userId, not id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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
      return res.status(403).json({ error: 'You can only review products you have purchased' });
    }

    const existingReview = await prisma.review.findFirst({
      where: { productId: parseInt(productId), userId },
    });

    if (existingReview) {
      const updatedReview = await prisma.review.update({
        where: { id: existingReview.id },
        data: { rating, comment },
        include: {
          user: { select: { id: true, name: true } },
        },
      });
      return res.json(updatedReview);
    }

    const review = await prisma.review.create({
      data: {
        productId: parseInt(productId),
        userId,
        rating,
        comment,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.userId;  // ← Fixed

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const review = await prisma.review.findFirst({
      where: { id: Number(id), userId },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const updatedReview = await prisma.review.update({
      where: { id: Number(id) },
      data: { rating, comment },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    res.json(updatedReview);
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;  // ← Fixed

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const review = await prisma.review.findFirst({
      where: { id: Number(id), userId },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    await prisma.review.delete({ where: { id: Number(id) } });
    res.json({ message: 'Review deleted' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};