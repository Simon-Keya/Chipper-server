import { Router } from 'express';
import { login, register, validateLogin, validateRegister } from '../controllers/authController';
import { validate } from '../middleware/validateMiddleware';

export const authRouter = () => {
  const router = Router();
  router.post('/login', validateLogin, validate, login);
  router.post('/register', validateRegister, validate, register);
  return router;
};