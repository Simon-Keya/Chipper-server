import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart 
} from '../controllers/cartController';

const router = Router();

router.get('/', authenticateToken, getCart);
router.post('/', authenticateToken, addToCart);
router.put('/:id', authenticateToken, updateCartItem);
router.delete('/:id', authenticateToken, removeFromCart);
router.delete('/', authenticateToken, clearCart);

export default router;