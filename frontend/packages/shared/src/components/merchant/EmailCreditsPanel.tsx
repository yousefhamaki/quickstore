'use client';

import { useEffect, useState } from 'react';
import {
    Coins,
    Loader2,
    Ban,
    AlertTriangle,
    ShoppingBag,
    TrendingUp,
    Send,
    Mail,
    Undo2,
    Wrench,
    ArrowUpRight,
    ArrowDownLeft,
    TimerOff,
    History,
} from 'lucide-react';
import { Card, CardContent } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Progress } from '@shared/components/ui/progress';
import { cn } from '@shared/lib/utils';
import { getEmailAccountBalance, EmailLedgerEntry } from '@shared/services/marketingService';

interface EmailCreditsPanelProps {
    storeId: string;
    /** Shown as a button in the header when provided — wire to whatever "buy credits" flow the host page already has (e.g. the Campaigns page's own Buy Credits dialog). */
    onBuyCredits?: () => void;
    /** Bump this (e.g. a counter) to force a refetch — useful right after a purchase/transfer completes elsewhere on the page. */
    refreshToken?: number | string;
    /** Compact mode drops the recent-activity list — used where vertical space is tighter. */
    compact?: boolean;
    /** Fired whenever the balance loads/changes — lets the host page gate its own UI (e.g. disabling toggles at 0) without duplicating the fetch. */
    onBalanceChange?: (balance: number | null) => void;
}

const LEDGER_META: Record<EmailLedgerEntry['type'], { icon: any; label: string; tone: 'positive' | 'negative' | 'neutral' }> = {
    monthly_grant: { icon: TrendingUp, label: 'Monthly grant', tone: 'positive' },
    purchase: { icon: ShoppingBag, label: 'Purchased', tone: 'positive' },
    campaign_debit: { icon: Send, label: 'Campaign sent', tone: 'negative' },
    transactional_debit: { icon: Mail, label: 'Order email', tone: 'negative' },
    bounce_refund: { icon: Undo2, label: 'Bounce refund', tone: 'positive' },
    correction: { icon: Wrench, label: 'Correction', tone: 'neutral' },
    transfer_out: { icon: ArrowUpRight, label: 'Transferred out', tone: 'neutral' },
    transfer_in: { icon: ArrowDownLeft, label: 'Transferred in', tone: 'positive' },
    expired: { icon: TimerOff, label: 'Expired', tone: 'negative' },
};

/**
 * Self-contained "Email Credits" widget: fetches its own balance + recent
 * ledger history and renders a full picture of a store's email-sending
 * capacity — available balance, this cycle's usage against the plan
 * allowance, the plan/purchased/reserved breakdown, how many unused plan
 * credits recently expired (they don't roll over between cycles — see
 * CampaignQuotaService.getCreditBalance), and a short recent-activity feed.
 *
 * Used on both the Emails settings page and the Campaigns page so a
 * merchant sees the exact same picture of their email credits wherever
 * they're looking at it.
 */
export function EmailCreditsPanel({ storeId, onBuyCredits, refreshToken, compact, onBalanceChange }: EmailCreditsPanelProps) {
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState<number | null>(null);
    const [planBalance, setPlanBalance] = useState(0);
    const [purchasedBalance, setPurchasedBalance] = useState(0);
    const [reserved, setReserved] = useState(0);
    const [ledger, setLedger] = useState<EmailLedgerEntry[]>([]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getEmailAccountBalance(storeId)
            .then((res) => {
                if (cancelled) return;
                setBalance(res.balance);
                setPlanBalance(res.planBalance || 0);
                setPurchasedBalance(res.purchasedBalance || 0);
                setReserved(res.reserved || 0);
                setLedger(res.ledgerHistory || []);
                onBalanceChange?.(res.balance);
            })
            .catch(() => {
                if (!cancelled) {
                    setBalance(null);
                    onBalanceChange?.(null);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [storeId, refreshToken]);

    if (loading) {
        return (
            <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-8 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (balance === null) {
        return null; // fetch failed — don't block the rest of the page over a display widget
    }

    const isZeroBalance = balance <= 0;
    const isLowBalance = balance > 0 && balance < 10;

    // "Used this cycle" is derived from the most recent monthly_grant entry
    // (the amount actually granted) against the current planBalance — there's
    // no separate "usage counter" field, so this is the best available signal.
    // Falls back to no progress bar if a store has never had a monthly grant
    // (e.g. free plan with 0 allowance).
    const latestGrant = ledger.find((e) => e.type === 'monthly_grant');
    const cycleAllowance = latestGrant?.amount || 0;
    const cycleUsedPercent = cycleAllowance > 0
        ? Math.max(0, Math.min(100, ((cycleAllowance - planBalance) / cycleAllowance) * 100))
        : null;

    // Most recent expiry event (unused plan credits that didn't roll over) —
    // shown as a one-line heads-up, not a running lifetime total, since only
    // the last cycle's expiry is actionable info for the merchant.
    const latestExpiry = ledger.find((e) => e.type === 'expired');

    const recentActivity = ledger.slice(0, 6);

    return (
        <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6 space-y-6">
                {/* Header row: big available number + buy button */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Coins className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-3xl font-black tracking-tight leading-none">{balance}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">Email credits available</p>
                        </div>
                    </div>
                    {onBuyCredits && (
                        <Button type="button" variant="outline" className="rounded-xl gap-2" onClick={onBuyCredits}>
                            <ShoppingBag className="w-4 h-4" /> Buy more credits
                        </Button>
                    )}
                </div>

                {/* Zero / low alerts */}
                {isZeroBalance && (
                    <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-3.5 flex items-start gap-3">
                        <Ban className="w-4.5 h-4.5 text-destructive mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-destructive">No email credits remaining</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Customer emails will not send right now — you'll be alerted instead. Top up or upgrade your plan to resume.</p>
                        </div>
                    </div>
                )}
                {isLowBalance && (
                    <div className="rounded-xl border-2 border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 p-3.5 flex items-start gap-3">
                        <AlertTriangle className="w-4.5 h-4.5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Only {balance} credit{balance === 1 ? '' : 's'} left</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Top up soon to avoid interruptions.</p>
                        </div>
                    </div>
                )}
                {latestExpiry && (
                    <div className="rounded-xl border bg-muted/30 p-3.5 flex items-start gap-3">
                        <TimerOff className="w-4.5 h-4.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-medium">{Math.abs(latestExpiry.amount)} unused plan credit{Math.abs(latestExpiry.amount) === 1 ? '' : 's'} expired</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Monthly plan credits don't roll over between cycles — use them or buy add-ons (which never expire between cycles) to avoid losing them again.</p>
                        </div>
                    </div>
                )}

                {/* This cycle's usage */}
                {cycleUsedPercent !== null && (
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold uppercase tracking-wide">
                            <span className="text-muted-foreground">This cycle</span>
                            <span>{cycleAllowance - planBalance} / {cycleAllowance} used</span>
                        </div>
                        <Progress value={cycleUsedPercent} className="h-2.5" />
                    </div>
                )}

                {/* Breakdown tiles */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/30 border rounded-xl p-3 text-center">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Plan allowance</span>
                        <span className="text-lg font-black tracking-tight">{planBalance}</span>
                    </div>
                    <div className="bg-muted/30 border rounded-xl p-3 text-center">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Purchased</span>
                        <span className="text-lg font-black tracking-tight text-indigo-600">{purchasedBalance}</span>
                    </div>
                    <div className="bg-muted/30 border rounded-xl p-3 text-center">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Reserved</span>
                        <span className="text-lg font-black tracking-tight text-amber-600">{reserved}</span>
                    </div>
                </div>

                {/* Recent activity */}
                {!compact && recentActivity.length > 0 && (
                    <div className="space-y-2 pt-1 border-t">
                        <div className="flex items-center gap-1.5 pt-3">
                            <History className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent activity</span>
                        </div>
                        <div className="space-y-1">
                            {recentActivity.map((entry) => {
                                const meta = LEDGER_META[entry.type] || LEDGER_META.correction;
                                const Icon = meta.icon;
                                return (
                                    <div key={entry._id} className="flex items-center gap-2.5 py-1.5 text-sm">
                                        <div
                                            className={cn(
                                                'w-6 h-6 rounded-lg flex items-center justify-center shrink-0',
                                                meta.tone === 'positive' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
                                                meta.tone === 'negative' && 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
                                                meta.tone === 'neutral' && 'bg-muted text-muted-foreground'
                                            )}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="flex-1 truncate text-muted-foreground">{entry.description}</span>
                                        <span
                                            className={cn(
                                                'font-semibold shrink-0',
                                                entry.amount > 0 ? 'text-emerald-600' : 'text-rose-600'
                                            )}
                                        >
                                            {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
