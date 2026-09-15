import express from 'express';
import { createSupportTicket, getSupportTicketStatus } from '../controllers/supportController';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiter for support tickets (max 5 requests per minute)
const supportLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5,
    message: { message: 'Too many support requests, please try again after a minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/ticket', supportLimiter, createSupportTicket);
router.get('/ticket/:ticketId', supportLimiter, getSupportTicketStatus);

export default router;
