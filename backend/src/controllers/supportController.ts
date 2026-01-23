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
export const getSupportTicketStatus = async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;

        const ticket = await SupportTicket.findOne({ ticketId });

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        res.status(200).json(ticket);
    } catch (error) {
        console.error('Get ticket status error:', error);
        res.status(500).json({ message: 'Error fetching ticket status', error });
    }
};
