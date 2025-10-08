// backend/routes/dashboard.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getDashboardData } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(authenticate);
router.get('/', getDashboardData);

export default router;