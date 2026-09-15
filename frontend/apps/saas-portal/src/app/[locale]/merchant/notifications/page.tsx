'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Bell, ShoppingCart, Truck, HandCoins, Star, CreditCard, AlertTriangle, XCircle, Loader2, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@shared/components/ui/button';
import { Card, CardContent } from '@shared/components/ui/card';
import { cn } from '@shared/lib/utils';
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    NotificationEntry,
    NotificationType,
} from '@shared/services/notificationService';

const TYPE_ICON: Record<NotificationType, React.ElementType> = {
    order_created: ShoppingCart,
    order_shipped: Truck,
    refund_requested: HandCoins,
    review_submitted: Star,
    subscription_renewed: CreditCard,
    subscription_past_due: AlertTriangle,
    subscription_expired: XCircle,
    signup_gift: Gift,
};

const TYPE_COLOR: Record<NotificationType, string> = {
    order_created: 'text-blue-600 bg-blue-50',
    order_shipped: 'text-purple-600 bg-purple-50',
    refund_requested: 'text-amber-600 bg-amber-50',
    review_submitted: 'text-yellow-600 bg-yellow-50',
    subscription_renewed: 'text-green-600 bg-green-50',
    subscription_past_due: 'text-amber-600 bg-amber-50',
    subscription_expired: 'text-red-600 bg-red-50',
    signup_gift: 'text-emerald-600 bg-emerald-50',
};

export default function NotificationsPage() {
    const t = useTranslations('merchant.notifications');
    const locale = useLocale();
    const dateLocale = locale === 'ar' ? ar : enUS;
    const router = useRouter();

    const [entries, setEntries] = useState<NotificationEntry[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);

    const load = async (targetPage: number) => {
        setLoading(true);
        try {
            const res = await getNotifications(targetPage, 20);
            setEntries(res.entries);
            setUnreadCount(res.unreadCount);
            setPages(res.pagination.pages || 1);
        } catch {
            toast.error(t('loadError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(page); }, [page]);

    const handleEntryClick = async (entry: NotificationEntry) => {
        if (!entry.isRead) {
            setEntries((prev) => prev.map((e) => (e._id === entry._id ? { ...e, isRead: true } : e)));
            setUnreadCount((c) => Math.max(0, c - 1));
            markNotificationRead(entry._id).catch(() => {});
        }
        if (entry.link) router.push(entry.link);
    };

    const handleMarkAllRead = async () => {
        setEntries((prev) => prev.map((e) => ({ ...e, isRead: true })));
        setUnreadCount(0);
        try {
            await markAllNotificationsRead();
        } catch {
            toast.error(t('loadError'));
            load(page);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Bell className="h-7 w-7" />
                        {t('title')}
                    </h1>
                    <p className="text-muted-foreground mt-1">{t('pageDescription')}</p>
                </div>
                {unreadCount > 0 && (
                    <Button variant="outline" onClick={handleMarkAllRead}>{t('markAllRead')}</Button>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : entries.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-16">{t('empty')}</p>
                    ) : (
                        entries.map((entry) => {
                            const Icon = TYPE_ICON[entry.type] || Bell;
                            return (
                                <button
                                    key={entry._id}
                                    onClick={() => handleEntryClick(entry)}
                                    className={cn(
                                        'w-full flex items-start gap-4 px-6 py-4 text-left rtl:text-right hover:bg-gray-50 transition-colors border-b last:border-b-0',
                                        !entry.isRead && 'bg-blue-50/50'
                                    )}
                                >
                                    <div className={cn('flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center', TYPE_COLOR[entry.type])}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn('text-sm', !entry.isRead ? 'font-bold' : 'font-medium text-gray-700')}>{entry.title}</p>
                                        <p className="text-sm text-muted-foreground mt-0.5">{entry.message}</p>
                                        <p className="text-xs text-muted-foreground mt-1.5">
                                            {format(new Date(entry.createdAt), 'PPp', { locale: dateLocale })}
                                        </p>
                                    </div>
                                    {!entry.isRead && <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-blue-600 mt-2" />}
                                </button>
                            );
                        })
                    )}
                </CardContent>
            </Card>

            {pages > 1 && (
                <div className="flex justify-between items-center mt-6">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('previous')}</Button>
                    <span className="text-sm text-muted-foreground">{t('pageOf', { page, pages })}</span>
                    <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>{t('next')}</Button>
                </div>
            )}
        </div>
    );
}
