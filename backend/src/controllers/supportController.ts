import { Request, Response } from 'express';
import SupportTicket from '../models/SupportTicket';
import { sendSupportTicketEmail } from '../utils/email';

// @desc    Submit a support ticket from Contact Us page
// @route   POST /api/support/ticket
// @access  Public
export const createSupportTicket = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, email, message } = req.body;

        if (!firstName || !lastName || !email || !message) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Generate a random ticket ID like QS-123456
        const ticketId = `QS-${Math.floor(100000 + Math.random() * 900000)}`;

        const ticket = await SupportTicket.create({
            ticketId,
            firstName,
            lastName,
            email,
            message,
            status: 'open',
            priority: 'medium'
        });

        // Send confirmation email
        await sendSupportTicketEmail(email, firstName, ticketId);

        res.status(201).json({
            message: 'Support ticket created successfully. We have sent a confirmation email.',
            ticketId: ticket.ticketId
        });
    } catch (error) {
        console.error('Support ticket error:', error);
        res.status(500).json({ message: 'Error creating support ticket', error });
    }
};
