import api from './api';

export type NotificationType =
    | 'order_created'
    | 'refund_requested'
    | 'review_submitted'
    | 'subscription_renewed'
    | 'subscription_past_due'
    | 'subscription_expired';

export interface NotificationEntry {
    _id: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

export interface NotificationsResponse {
    entries: NotificationEntry[];
    unreadCount: number;
    pagination: { page: number; limit: number; total: number; pages: number };
}

export const getNotifications = async (page = 1, limit = 20): Promise<NotificationsResponse> => {
    const response = await api.get<NotificationsResponse>(`/notifications?page=${page}&limit=${limit}`);
    return response.data;
};

export const getUnreadNotificationCount = async (): Promise<number> => {
    const response = await api.get<{ unreadCount: number }>('/notifications/unread-count');
    return response.data.unreadCount;
};

export const markNotificationRead = async (id: string): Promise<void> => {
    await api.put(`/notifications/${id}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
    await api.put('/notifications/mark-all-read');
};
