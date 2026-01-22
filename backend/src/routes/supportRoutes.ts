import express from 'express';
import { createSupportTicket } from '../controllers/supportController';

const router = express.Router();

router.post('/ticket', createSupportTicket);

export default router;
