import express from 'express';
import { askQuestion, submitTicket, logFeedback } from '../controllers/chatController';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for chatbot to prevent abuse (e.g., max 10 requests per minute)
const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10,
    message: { message: 'Too many requests, please try again after a minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/ask', chatLimiter, askQuestion);
router.post('/feedback', chatLimiter, logFeedback);
router.post('/submit-ticket', chatLimiter, submitTicket);

export default router;
