import cors from 'cors';
import express, { Application } from 'express';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { errorMiddleware } from './middleware/errorMiddleware';
import { rateLimiter } from './middleware/rateLimitMiddleware';
import { authRouter } from './routes/authRoutes';
import { categoryRouter } from './routes/categoryRoutes';
import { orderRouter } from './routes/orderRoutes';
import { productRouter } from './routes/productRoutes';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(rateLimiter);

// Routes
app.use('/api/products', productRouter); // socket injected later
app.use('/api/categories', categoryRouter);
app.use('/api/orders', orderRouter());
app.use('/api/auth', authRouter());

// Swagger docs
const swaggerDocument = YAML.load(path.join(__dirname, '../docs/swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Healthcheck
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handler
app.use(errorMiddleware);

export default app;
