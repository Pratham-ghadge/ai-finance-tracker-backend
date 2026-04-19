import express from 'express';
import { getProfile, updateProfile } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

export default router;
