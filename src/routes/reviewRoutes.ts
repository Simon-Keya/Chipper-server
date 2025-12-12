// src/routes/reviewRoutes.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  getReviews,
  createReview,
  updateReview,
  deleteReview,
} from '../controllers/reviewController';

const router = Router();

router.get('/:productId', getReviews);
router.post('/:productId', authenticateToken, createReview);
router.put('/:id', authenticateToken, updateReview);
router.delete('/:id', authenticateToken, deleteReview);

export default router;