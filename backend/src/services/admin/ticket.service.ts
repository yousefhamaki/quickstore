import SupportTicket from '../../models/SupportTicket';
import { logAdminAction } from './audit.service';
import { sendSupportReplyNotification } from './notification.service';

export const getAllTickets = async (filters: { status?: string; priority?: string } = {}) => {
    const query: any = {};
    if (filters.status) {
        query.status = filters.status;
    }
    if (filters.priority) {
        query.priority = filters.priority;
    }
    return SupportTicket.find(query).sort({ updatedAt: -1 });
};

export const addReply = async (
    ticketId: string,
    message: string,
    senderName: string,
    attachments: string[] | undefined,
    internalNote: boolean,
    actorId: string,
    ipAddress?: string
) => {
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
        throw new Error('Support ticket not found');
    }

    const beforeRepliesCount = ticket.replies ? ticket.replies.length : 0;

    const newReply = {
        sender: 'admin' as const,
        senderName,
        message,
        attachments,
        internalNote,
        createdAt: new Date()
    };

    if (!ticket.replies) {
        ticket.replies = [];
    }
    ticket.replies.push(newReply);

    if (!internalNote && ticket.status === 'open') {
        ticket.status = 'in_progress';
    }
    await ticket.save();

    await logAdminAction(
        actorId,
        'ticket.reply',
        'SupportTicket',
        ticketId,
        { repliesCount: beforeRepliesCount, status: ticket.status },
        { repliesCount: ticket.replies.length, status: ticket.status },
        internalNote ? 'Added internal note' : 'Sent reply to user',
        ipAddress
    );

    if (!internalNote) {
        sendSupportReplyNotification(ticket.email, ticket.firstName, ticket.ticketId, message)
            .catch(err => console.error('[TicketService] Notification email error:', err));
    }

    return ticket;
};

export const updateTicketStatus = async (
    ticketId: string,
    status: 'open' | 'in_progress' | 'resolved' | 'closed',
    actorId: string,
    reason?: string,
    ipAddress?: string
) => {
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
        throw new Error('Support ticket not found');
    }

    const beforeState = { status: ticket.status };
    ticket.status = status;
    await ticket.save();

    await logAdminAction(
        actorId,
        'ticket.status',
        'SupportTicket',
        ticketId,
        beforeState,
        { status },
        reason || `Status updated to ${status}`,
        ipAddress
    );

    return ticket;
};
