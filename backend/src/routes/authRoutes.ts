import express from 'express';
import { registerUser, loginUser, getUserProfile, verifyEmail, googleLogin } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// @ts-ignore
router.post('/register', registerUser);
router.post('/login', loginUser);
// @ts-ignore
router.post('/verify-email', verifyEmail);
// @ts-ignore
router.post('/google', googleLogin);
router.get('/profile', protect, getUserProfile);

export default router;
