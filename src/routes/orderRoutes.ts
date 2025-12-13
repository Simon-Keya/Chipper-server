// src/routes/orderRoutes.ts

import { Router } from 'express';
import { getOrders } from '../controllers/orderController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, getOrders);

export default router;