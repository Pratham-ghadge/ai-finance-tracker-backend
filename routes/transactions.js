import express from 'express';
import {
  addTransaction,
  deleteTransaction,
  getTransactions,
  importTransactionsFromCsv,
  importTransactionsFromSms,
  updateTransaction,
} from '../controllers/transactionController.js';
import { fetchSimulatedTransactions } from '../controllers/syncController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.get('/', getTransactions);
router.post('/', addTransaction);
router.post('/import/csv', importTransactionsFromCsv);
router.post('/import/sms', importTransactionsFromSms);
router.post('/sync', fetchSimulatedTransactions);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
