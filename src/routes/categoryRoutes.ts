import { Request, Response, Router } from 'express';
import { createCategory, deleteCategory, getCategories, updateCategory, validateCategory } from '../controllers/categoryController';
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware';

export const categoryRouter = (io: any) => {
  const router = Router();
  router.get('/', getCategories);
  router.post('/', authMiddleware, adminMiddleware, validateCategory, (req: Request, res: Response) => createCategory(req, res, io));
  router.put('/:id', authMiddleware, adminMiddleware, validateCategory, (req: Request, res: Response) => updateCategory(req, res, io));
  router.delete('/:id', authMiddleware, adminMiddleware, (req: Request, res: Response) => deleteCategory(req, res, io));
  return router;
};