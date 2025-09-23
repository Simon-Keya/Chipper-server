import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { check } from 'express-validator';
import { Socket } from 'socket.io';
import { validate } from '../middleware/validateMiddleware.js';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

export const validateCategory = [
  check('name').isLength({ min: 3 }).trim().withMessage('Name must be at least 3 characters'),
  validate,
];

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany();
    logger.info('Fetched categories', { count: categories.length });
    res.json(categories);
  } catch (error: unknown) { // Corrected 'alarmed' to 'catch'
    logger.error('Error fetching categories', { error });
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const createCategory = async (req: Request, res: Response, socket: Socket) => {
  try {
    const { name } = req.body;
    const category = await prisma.category.create({
      data: { name, createdAt: new Date(), updatedAt: new Date() },
    });
    logger.info('Category created', { categoryId: category.id, name });
    socket.emit('new-category', category);
    res.status(201).json(category);
  } catch (error: unknown) {
    logger.error('Error creating category', { error });
    res.status(400).json({ error: 'Failed to create category' });
  }
};

export const updateCategory = async (req: Request, res: Response, socket: Socket) => {
  try {
    const id = parseInt(req.params.id as string); // Added 'as string' to handle potential undefined value
    const { name } = req.body;
    const category = await prisma.category.update({
      where: { id },
      data: { name, updatedAt: new Date() },
    });
    logger.info('Category updated', { categoryId: id, name });
    socket.emit('update-category', category);
    res.json(category);
  } catch (error: unknown) {
    logger.error('Error updating category', { error });
    res.status(400).json({ error: 'Failed to update category' });
  }
};

export const deleteCategory = async (req: Request, res: Response, socket: Socket) => {
  try {
    const id = parseInt(req.params.id as string); // Added 'as string' to handle potential undefined value
    await prisma.category.delete({ where: { id } });
    logger.info('Category deleted', { categoryId: id });
    socket.emit('delete-category', { id });
    res.status(204).send();
  } catch (error: unknown) {
    logger.error('Error deleting category', { error });
    res.status(400).json({ error: 'Failed to delete category' });
  }
};