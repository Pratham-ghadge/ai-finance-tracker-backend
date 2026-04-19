import express from 'express';
import {
  createAccount,
  deleteAccount,
  getAccounts,
  updateAccount,
} from '../controllers/accountController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.route('/').get(getAccounts).post(createAccount);
router.route('/:id').put(updateAccount).delete(deleteAccount);

export default router;
