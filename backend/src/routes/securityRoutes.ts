import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/authMiddleware';
import {
    changePassword,
    logout,
    getActiveSessions,
    revokeSession,
    revokeAllOtherSessions,
    getLoginHistory,
    setupTotp,
    verifyTotpSetup,
    enableEmailTwoFactor,
    disableTwoFactor,
    regenerateBackupCodes,
    verifyTwoFactorLogin,
    resendTwoFactorEmailCode,
} from '../controllers/securityController';

const router = express.Router();

// Same shape as authRoutes' limiter — these are exactly the kind of
// endpoints (password confirmation, code verification) worth rate-limiting.
const sensitiveLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: { message: 'Too many attempts, please try again after a minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// --- Public: the 2FA login challenge (no live session yet, gated by a short-lived challenge token instead) ---
router.post('/2fa/verify-login', sensitiveLimiter, verifyTwoFactorLogin);
router.post('/2fa/resend-email-code', sensitiveLimiter, resendTwoFactorEmailCode);

// --- Everything below requires an authenticated session ---
router.use(protect);

router.put('/change-password', sensitiveLimiter, changePassword);
router.post('/logout', logout);

router.get('/sessions', getActiveSessions);
router.delete('/sessions/:id', revokeSession);
router.post('/sessions/revoke-others', revokeAllOtherSessions);

router.get('/login-history', getLoginHistory);

router.post('/2fa/totp/setup', setupTotp);
router.post('/2fa/totp/verify-setup', sensitiveLimiter, verifyTotpSetup);
router.post('/2fa/email/enable', sensitiveLimiter, enableEmailTwoFactor);
router.post('/2fa/disable', sensitiveLimiter, disableTwoFactor);
router.post('/2fa/backup-codes/regenerate', sensitiveLimiter, regenerateBackupCodes);

export default router;
