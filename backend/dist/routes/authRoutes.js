"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = express_1.default.Router();
// Rate limiter for sensitive authentication endpoints (max 5 requests per minute)
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5,
    message: { message: 'Too many authentication attempts, please try again after a minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// @ts-ignore
router.post('/register', authLimiter, authController_1.registerUser);
router.post('/login', authLimiter, authController_1.loginUser);
// @ts-ignore
router.post('/verify-email', authLimiter, authController_1.verifyEmail);
// @ts-ignore
router.post('/google', authLimiter, authController_1.googleLogin);
router.get('/profile', authMiddleware_1.protect, authController_1.getUserProfile);
// @ts-ignore
router.post('/resend-verification', authLimiter, authController_1.resendVerificationEmail);
exports.default = router;
