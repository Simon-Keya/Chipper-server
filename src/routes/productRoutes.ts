import { Request, Response, Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct,
  validateCreateProduct,
  validateUpdateProduct,
} from '../controllers/productController';
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware';

export const productRouter = (io: any) => {
  const router = Router();

  // ✅ Public routes
  router.get('/', getProducts);
  router.get('/:id', getProductById); // <-- Added this for single product details

  // ✅ Protected admin routes
  router.post(
    '/',
    authMiddleware,
    adminMiddleware,
    validateCreateProduct,
    (req: Request, res: Response) => createProduct(req, res, io)
  );

  router.put(
    '/:id',
    authMiddleware,
    adminMiddleware,
    validateUpdateProduct,
    (req: Request, res: Response) => updateProduct(req, res, io)
  );

  router.delete(
    '/:id',
    authMiddleware,
    adminMiddleware,
    (req: Request, res: Response) => deleteProduct(req, res, io)
  );

  return router;
};
