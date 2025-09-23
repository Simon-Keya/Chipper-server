import { Router } from 'express';
import { createOrder, getOrders, validateOrder } from '../controllers/orderController';
import { authMiddleware } from '../middleware/authMiddleware';

export const orderRouter = () => {
  const router = Router();
  router.get('/', authMiddleware, getOrders);
  router.post('/', authMiddleware, validateOrder, createOrder);
  return router;
};