import { Request, Response, Router } from 'express';
import type { Socket } from 'socket.io'; // Import the Socket type
import { createProduct, deleteProduct, getProducts, updateProduct, validateProduct } from '../controllers/productController';
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware';

export const productRouter = (io: Socket) => {
  const router = Router();
  router.get('/', getProducts);
  router.post('/', authMiddleware, adminMiddleware, validateProduct, (req: Request, res: Response) => createProduct(req, res, io));
  router.put('/:id', authMiddleware, adminMiddleware, validateProduct, (req: Request, res: Response) => updateProduct(req, res, io));
  router.delete('/:id', authMiddleware, adminMiddleware, (req: Request, res: Response) => deleteProduct(req, res, io));
  return router;
};