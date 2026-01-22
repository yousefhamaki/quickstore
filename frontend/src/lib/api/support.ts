import api from '@/services/api';

export interface SupportTicketData {
    firstName: string;
    lastName: string;
    email: string;
    message: string;
}

export const createSupportTicket = async (data: SupportTicketData) => {
    const response = await api.post('/support/ticket', data);
    return response.data;
};
