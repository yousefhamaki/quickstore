import express from 'express';
import { createSupportTicket, getSupportTicketStatus } from '../controllers/supportController';

const router = express.Router();

router.post('/ticket', createSupportTicket);
router.get('/ticket/:ticketId', getSupportTicketStatus);

export default router;
