import { Request, Response } from 'express';
import { check } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { Server } from 'socket.io';
import { validate } from '../middleware/validateMiddleware';
import { uploadImage } from '../utils/cloudinary';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

// Multer config (same as products)
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// Validation
export const validateCategory = [
  check('name')
    .isLength({ min: 3 })
    .trim()
    .withMessage('Name must be at least 3 characters'),
  validate,
];

// GET all categories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(categories);
  } catch (error) {
    logger.error('Error fetching categories', { error });
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// CREATE category (with image)
export const createCategory = async (req: Request, res: Response, io: Server) => {
  try {
    const { name } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ error: 'Category image is required' });
    }

    const imageUrl = await uploadImage(imageFile);

    const category = await prisma.category.create({
      data: {
        name,
        imageUrl,
      },
    });

    logger.info('Category created', { id: category.id, name });
    io.emit('new-category', category);

    res.status(201).json(category);
  } catch (error) {
    logger.error('Error creating category', { error });
    res.status(400).json({ error: 'Failed to create category' });
  }
};

// UPDATE category (image optional)
export const updateCategory = async (req: Request, res: Response, io: Server) => {
  try {
    const id = Number(req.params.id);
    const { name } = req.body;
    const imageFile = req.file;

    const updateData: any = { name };

    if (imageFile) {
      updateData.imageUrl = await uploadImage(imageFile);
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    logger.info('Category updated', { id, name });
    io.emit('update-category', category);

    res.json(category);
  } catch (error) {
    logger.error('Error updating category', { error });
    res.status(400).json({ error: 'Failed to update category' });
  }
};

// DELETE category
export const deleteCategory = async (req: Request, res: Response, io: Server) => {
  try {
    const id = Number(req.params.id);

    await prisma.category.delete({ where: { id } });

    logger.info('Category deleted', { id });
    io.emit('delete-category', { id });

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting category', { error });
    res.status(400).json({ error: 'Failed to delete category' });
  }
};