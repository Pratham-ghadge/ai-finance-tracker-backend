// backend/server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import sql, { testConnection } from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import dashboardRoutes from './routes/dashboard.js';
import accountRoutes from './routes/accounts.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(limiter);

// CORS
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('📦 Request body:', req.body);
  console.log('🔑 Headers:', req.headers);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/accounts', accountRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const result = await sql`SELECT version()`;
    const { version } = result[0];
    res.json({ 
      message: 'Finance Tracker API is running 🚀',
      database: {
        status: 'connected',
        version: version,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'API running but database connection failed',
      error: error.message
    });
  }
});

// Simple test endpoint
app.get('/api/test', async (req, res) => {
  try {
    const result = await sql`SELECT version()`;
    const { version } = result[0];
    res.setHeader('Content-Type', 'text/plain');
    res.send(version);
  } catch (error) {
    res.status(500).send('Database connection failed: ' + error.message);
  }
});

// Test body parsing endpoint
app.post('/api/test-body', (req, res) => {
  console.log('✅ Test body endpoint - Body received:', req.body);
  res.json({ 
    message: 'Body parsing is working!',
    receivedBody: req.body,
    bodyType: typeof req.body
  });
});

// 404 handler for specific API routes - NO WILDCARD
app.use('/api/health', (req, res, next) => next()); // Skip for health route
app.use('/api/test', (req, res, next) => next()); // Skip for test route
app.use('/api/test-body', (req, res, next) => next()); // Skip for test-body route

// Custom 404 handler without wildcards
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && 
      !req.path.startsWith('/api/health') &&
      !req.path.startsWith('/api/test') &&
      !req.path.startsWith('/api/test-body')) {
    console.log('❌ 404 - API endpoint not found:', req.originalUrl);
    return res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.originalUrl,
      method: req.method,
      message: 'Available endpoints: /api/auth/*, /api/transactions/*, /api/dashboard, /api/accounts/*'
    });
  }
  next();
});

// General 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: 'This route does not exist. Available API routes start with /api/'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

// Database connection check
async function checkDatabaseConnection() {
  try {
    await testConnection();
  } catch (error) {
    console.error('Database connection check failed:', error.message);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`📝 Test body parsing: POST http://localhost:${PORT}/api/test-body`);
  await checkDatabaseConnection();
});

