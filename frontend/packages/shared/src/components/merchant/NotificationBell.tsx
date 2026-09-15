'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Bell, ShoppingCart, Truck, HandCoins, Star, CreditCard, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@shared/lib/utils';
import {
    getNotifications,
    getUnreadNotificationCount,
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
};

const TYPE_COLOR: Record<NotificationType, string> = {
    order_created: 'text-blue-600 bg-blue-50',
    order_shipped: 'text-purple-600 bg-purple-50',
    refund_requested: 'text-amber-600 bg-amber-50',
    review_submitted: 'text-yellow-600 bg-yellow-50',
    subscription_renewed: 'text-green-600 bg-green-50',
    subscription_past_due: 'text-amber-600 bg-amber-50',
    subscription_expired: 'text-red-600 bg-red-50',
};

// Polling, not a websocket — this app has no real-time transport, and a
// 30s interval is frequent enough for a badge count while staying cheap
// (one lightweight COUNT query per tick, only while the tab is open).
const POLL_INTERVAL_MS = 30 * 1000;

export function NotificationBell() {
    const t = useTranslations('merchant.notifications');
    const locale = useLocale();
    const dateLocale = locale === 'ar' ? ar : enUS;
    const router = useRouter();
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [entries, setEntries] = useState<NotificationEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // The bell lives inside the sidebar header, which is only 256px wide
    // (w-64) — narrower than the 320px (w-80) dropdown itself. Anchoring
    // the dropdown with CSS alone (e.g. `right-0` on a relatively-positioned
    // wrapper) pushes it partly or entirely off-screen to the left, since
    // there's nowhere near enough room inside that wrapper for a dropdown
    // wider than it. Measuring the button's real on-screen position and
    // positioning the dropdown with `fixed` + clamped coordinates sidesteps
    // that entirely, regardless of sidebar width, viewport size, or LTR/RTL.
    const DROPDOWN_WIDTH = 320;
    const VIEWPORT_MARGIN = 8;

    const computePosition = () => {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (!rect) return;
        const left = Math.min(
            Math.max(rect.right - DROPDOWN_WIDTH, VIEWPORT_MARGIN),
            window.innerWidth - DROPDOWN_WIDTH - VIEWPORT_MARGIN
        );
        setDropdownPos({ top: rect.bottom + 8, left });
    };

    useEffect(() => {
        if (!open) return;
        computePosition();
        window.addEventListener('resize', computePosition);
        return () => window.removeEventListener('resize', computePosition);
    }, [open]);

    const refreshUnreadCount = async () => {
        try {
            setUnreadCount(await getUnreadNotificationCount());
        } catch {
            // Silent — a failed poll shouldn't surface an error toast for a badge count.
        }
    };

    useEffect(() => {
        refreshUnreadCount();
        const interval = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        getNotifications(1, 10)
            .then((res) => { setEntries(res.entries); setUnreadCount(res.unreadCount); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [open]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEntryClick = async (entry: NotificationEntry) => {
        if (!entry.isRead) {
            setEntries((prev) => prev.map((e) => (e._id === entry._id ? { ...e, isRead: true } : e)));
            setUnreadCount((c) => Math.max(0, c - 1));
            markNotificationRead(entry._id).catch(() => {});
        }
        setOpen(false);
        if (entry.link) router.push(entry.link);
    };

    const handleMarkAllRead = async () => {
        setEntries((prev) => prev.map((e) => ({ ...e, isRead: true })));
        setUnreadCount(0);
        try {
            await markAllNotificationsRead();
        } catch {
            refreshUnreadCount();
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
                aria-label={t('bellLabel')}
            >
                <Bell className="h-5 w-5 text-gray-600" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && dropdownPos && (
                <div
                    className="fixed w-80 max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-2xl border z-50 overflow-hidden"
                    style={{ top: dropdownPos.top, left: dropdownPos.left }}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <p className="font-bold text-sm">{t('title')}</p>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className="text-xs font-medium text-blue-600 hover:underline">
                                {t('markAllRead')}
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                        ) : entries.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">{t('empty')}</p>
                        ) : (
                            entries.map((entry) => {
                                const Icon = TYPE_ICON[entry.type] || Bell;
                                return (
                                    <button
                                        key={entry._id}
                                        onClick={() => handleEntryClick(entry)}
                                        className={cn(
                                            'w-full flex items-start gap-3 px-4 py-3 text-left rtl:text-right hover:bg-gray-50 transition-colors border-b last:border-b-0',
                                            !entry.isRead && 'bg-blue-50/50'
                                        )}
                                    >
                                        <div className={cn('flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center', TYPE_COLOR[entry.type])}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn('text-sm', !entry.isRead ? 'font-bold' : 'font-medium text-gray-700')}>{entry.title}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{entry.message}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: dateLocale })}
                                            </p>
                                        </div>
                                        {!entry.isRead && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600 mt-1.5" />}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <button
                        onClick={() => { setOpen(false); router.push('/merchant/notifications'); }}
                        className="w-full py-2.5 text-center text-xs font-bold text-blue-600 hover:bg-gray-50 border-t"
                    >
                        {t('viewAll')}
                    </button>
                </div>
            )}
        </div>
    );
}
