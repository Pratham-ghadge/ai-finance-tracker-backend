import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { connectDatabase } from './config/database.js';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import transactionRoutes from './routes/transactions.js';
import dashboardRoutes from './routes/dashboard.js';
import investmentRoutes from './routes/investments.js';
import userRoutes from './routes/userRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 250,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Finance Tracker API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/user', userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
