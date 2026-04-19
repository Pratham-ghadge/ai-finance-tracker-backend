import express from 'express';
import { getInvestmentSuggestions } from '../controllers/investmentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.get('/', getInvestmentSuggestions);

export default router;
