import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { initializeDatabase } from './models/db';
import { initSocket } from './sockets/socketHandler';
import { config } from './utils/config';
import logger from './utils/logger';

// Route initializers (some need `io` for real-time features)
import initializeProductRoutes from './routes/productRoutes';
import { categoryRouter } from './routes/categoryRoutes';
import { orderRouter } from './routes/orderRoutes';
import { authRouter } from './routes/authRoutes';
import { cartRouter } from './routes/cartRoutes';
import { reviewRouter } from './routes/reviewRoutes';

dotenv.config();

const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase();
    logger.info('Database connected successfully');

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.IO with CORS
    const io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://chipper-gray.vercel.app'] 
          : ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST'],
      },
    });

    // Initialize real-time socket events
    initSocket(io);

    // Attach routes
    // Routes that need real-time (Socket.IO) get `io` passed
    app.use('/api/products', initializeProductRoutes(io));
    app.use('/api/categories', categoryRoutes(io));
    app.use('/api/cart', cartRoutes(io));         // Real-time cart updates
    app.use('/api/reviews', reviewRoutes(io));    // Live review notifications

    // Routes that don't need socket
    app.use('/api/orders', orderRoutes());
    app.use('/api/auth', authRoutes());

    // Start server
    server.listen(config.PORT, () => {
      logger.info(`Server running on:${config.PORT}`);
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`Swagger UI:${config.PORT}/api-docs`);
      }
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.warn(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed');
        io.close(() => {
          logger.info('Socket.IO server closed');
          process.exit(0);
        });
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    logger.error('Failed to start server:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
    process.exit(1);
  }
};

startServer();