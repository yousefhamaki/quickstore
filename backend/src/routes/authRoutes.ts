import express from 'express';
import { registerUser, loginUser, getUserProfile, updateUserProfile, verifyEmail, googleLogin, resendVerificationEmail, refreshAccessToken } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiter for sensitive authentication endpoints (max 5 requests per minute)
const authLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5,
    message: { message: 'Too many authentication attempts, please try again after a minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// @ts-ignore
router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
// @ts-ignore
router.post('/verify-email', authLimiter, verifyEmail);
// @ts-ignore
router.post('/google', authLimiter, googleLogin);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
// @ts-ignore
router.post('/resend-verification', authLimiter, resendVerificationEmail);
// @ts-ignore
router.post('/refresh', authLimiter, refreshAccessToken);

export default router;
