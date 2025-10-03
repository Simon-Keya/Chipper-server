import { Request, Response, Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
  validateCreateProduct,
  validateUpdateProduct,
} from '../controllers/productController';
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware';

export const productRouter = (io: any) => {
  const router = Router();

  router.get('/', getProducts);

  router.post(
    '/',
    authMiddleware,
    adminMiddleware,
    validateCreateProduct, // ✅ stricter rules
    (req: Request, res: Response) => createProduct(req, res, io)
  );

  router.put(
    '/:id',
    authMiddleware,
    adminMiddleware,
    validateUpdateProduct, // ✅ looser rules
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
