import cors from 'cors';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { errorMiddleware } from './middleware/errorMiddleware';
import { rateLimiter } from './middleware/rateLimitMiddleware';
import { authRouter } from './routes/authRoutes';
import { categoryRouter } from './routes/categoryRoutes';
import { orderRouter } from './routes/orderRoutes';
import { productRouter } from './routes/productRoutes';
import { initSocket } from './sockets/socketHandler';
import { config } from './utils/config';
import logger from './utils/logger';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(rateLimiter);

initSocket(io);

app.use('/api/products', productRouter(io));
app.use('/api/categories', categoryRouter(io));
app.use('/api/orders', orderRouter());
app.use('/api/auth', authRouter());

app.use(errorMiddleware);

server.listen(config.port, () => {
  logger.info(`Backend running on http://localhost:${config.port}`);
});