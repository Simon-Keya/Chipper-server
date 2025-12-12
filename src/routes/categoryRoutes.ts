import { Router } from 'express';
import { upload } from '../controllers/categoryController';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  validateCategory,
} from '../controllers/categoryController';

export const categoryRouter = (io: any) => {
  const router = Router();

  // Public
  router.get('/', getCategories);

  // Admin only — with image upload
  router.post(
    '/',
    authMiddleware,
    adminMiddleware,
    upload.single('image'),        // Handle image upload
    validateCategory,
    (req, res) => createCategory(req, res, io)
  );

  router.put(
    '/:id',
    authMiddleware,
    adminMiddleware,
    upload.single('image'),        // Optional image update
    validateCategory,
    (req, res) => updateCategory(req, res, io)
  );

  router.delete('/:id', authMiddleware, adminMiddleware, (req, res) =>
    deleteCategory(req, res, io)
  );

  return router;
};