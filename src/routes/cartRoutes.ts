// src/routes/cartRoutes.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../controllers/cartController';

const router = Router();

router.use(authenticateToken);
router.get('/', getCart);
router.post('/', addToCart);
router.put('/:id', updateCartItem);
router.delete('/:id', removeFromCart);
router.delete('/', clearCart);

export default router;