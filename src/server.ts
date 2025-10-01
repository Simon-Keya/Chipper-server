import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { initializeDatabase } from './models/db';
import { initSocket } from './sockets/socketHandler';
import { config } from './utils/config';
import logger from './utils/logger';

dotenv.config();

const startServer = async () => {
  try {
    await initializeDatabase();
    logger.info('✅ Database connected successfully');

    const server = http.createServer(app);
    const io = new Server(server, { cors: { origin: '*' } });

    // Init socket handlers
    initSocket(io);

    // Inject io into routers that need real-time updates
    app.use('/api/products', require('./routes/productRoutes').productRouter(io));
    app.use('/api/categories', require('./routes/categoryRoutes').categoryRouter(io));

    // Start server
    server.listen(config.PORT, () => {
      logger.info(`✅ Backend running on http://localhost:${config.PORT}`);
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`📚 Swagger docs: http://localhost:${config.PORT}/api-docs`);
      }
    });

    // Graceful shutdown signals
    process.on('SIGINT', () => logger.warn('🛑 Received SIGINT. Shutting down...'));
    process.on('SIGTERM', () => logger.warn('🛑 Received SIGTERM. Shutting down...'));
  } catch (error) {
    logger.error('❌ Failed to start server:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        DATABASE_URL: process.env.DATABASE_URL ? '[set]' : '[not set]',
      },
    });
    process.exit(1);
  }
};

startServer();
