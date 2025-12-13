// src/server.ts

import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { initializeDatabase } from './models/db';
import { initSocket } from './sockets/socketHandler';
import { config } from './utils/config';
import logger from './utils/logger';

// Route imports
import { authRouter } from './routes/authRoutes';
import cartRouter from './routes/cartRoutes';
import { categoryRouter } from './routes/categoryRoutes';
import orderRouter from './routes/orderRoutes'; // ← Fixed: default import
import initializeProductRoutes from './routes/productRoutes';
import reviewRouter from './routes/reviewRoutes';

dotenv.config();

const startServer = async () => {
  try {
    await initializeDatabase();
    logger.info('Database connected successfully');

    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin:
          process.env.NODE_ENV === 'production'
            ? ['https://chipper-gray.vercel.app']
            : ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    initSocket(io);

    app.use('/api/products', initializeProductRoutes(io));
    app.use('/api/categories', categoryRouter(io));

    app.use('/api/cart', cartRouter);
    app.use('/api/reviews', reviewRouter);
    app.use('/api/orders', orderRouter);  // ← No () needed — it's already the router
    app.use('/api/auth', authRouter());

    server.listen(config.PORT, () => {
      logger.info(`Server running on http://localhost:${config.PORT}`);
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`Swagger Docs: http://localhost:${config.PORT}/api-docs`);
      }
    });

    const shutdown = (signal: string) => {
      logger.warn(`${signal} received. Shutting down...`);
      server.close(() => {
        logger.info('HTTP server closed');
        io.close(() => {
          logger.info('Socket.IO closed');
          process.exit(0);
        });
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error('Failed to start server', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
    process.exit(1);
  }
};

startServer();