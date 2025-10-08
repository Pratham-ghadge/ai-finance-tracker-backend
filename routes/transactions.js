// backend/routes/transactions.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { 
  addTransaction, 
  getTransactions, 
  getTransactionById,
  updateTransaction,
  deleteTransaction 
} from '../controllers/transactionController.js';

const router = express.Router();

router.use(authenticate);

router.post('/', addTransaction);
router.get('/', getTransactions);
router.get('/:id', getTransactionById);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;