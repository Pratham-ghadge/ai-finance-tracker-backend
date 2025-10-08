// backend/routes/accounts.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { 
  createAccount, 
  getAccounts, 
  updateAccount, 
  deleteAccount 
} from '../controllers/accountController.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createAccount);
router.get('/', getAccounts);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);

export default router;