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
    CalendarClock,
    Infinity as InfinityIcon,
    Archive,
} from 'lucide-react';
import { Card, CardContent } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Progress } from '@shared/components/ui/progress';
import { Badge } from '@shared/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@shared/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
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
    monthly_grant: { icon: TrendingUp, label: 'Plan credit grant', tone: 'positive' },
    purchase: { icon: ShoppingBag, label: 'Purchased', tone: 'positive' },
    campaign_debit: { icon: Send, label: 'Campaign sent', tone: 'negative' },
    transactional_debit: { icon: Mail, label: 'Order email', tone: 'negative' },
    bounce_refund: { icon: Undo2, label: 'Bounce refund', tone: 'positive' },
    correction: { icon: Wrench, label: 'Correction', tone: 'neutral' },
    transfer_out: { icon: ArrowUpRight, label: 'Transferred out', tone: 'neutral' },
    transfer_in: { icon: ArrowDownLeft, label: 'Transferred in', tone: 'positive' },
    expired: { icon: TimerOff, label: 'Expired', tone: 'negative' },
};

function daysUntil(iso: string): number {
    return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

/**
 * Self-contained "Email Credits" widget: fetches its own balance + recent
 * ledger history and renders a full picture of a store's email-sending
 * capacity, split into the two credit types Buildora actually has (shown
 * as two distinct lines, per how they behave):
 *
 *   - PLAN credits: granted by the store's subscription plan, valid for a
 *     rolling 30 days, refreshed every 30 days for as long as the plan
 *     stays active (regardless of monthly/yearly billing) -- and reset to
 *     0 immediately (not after a delay) if the plan lapses. Debited FIRST
 *     on every send (see CampaignQuotaService.debitTransactional/
 *     settleCredits) -- purchased credits are only ever touched once plan
 *     credits hit 0.
 *   - PURCHASED credits: bought as an add-on, never expire.
 *
 * Also surfaces a "View full history" table (up to the last 50 ledger
 * entries) so a merchant can see exactly where every credit went.
 */
export function EmailCreditsPanel({ storeId, onBuyCredits, refreshToken, compact, onBalanceChange }: EmailCreditsPanelProps) {
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState<number | null>(null);
    const [planBalance, setPlanBalance] = useState(0);
    const [purchasedBalance, setPurchasedBalance] = useState(0);
    const [reserved, setReserved] = useState(0);
    const [planIsActive, setPlanIsActive] = useState(false);
    const [planRefreshAt, setPlanRefreshAt] = useState<string | null>(null);
    const [ledger, setLedger] = useState<EmailLedgerEntry[]>([]);
    const [historyOpen, setHistoryOpen] = useState(false);

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
                setPlanIsActive(!!res.planIsActive);
                setPlanRefreshAt(res.planRefreshAt || null);
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
    const latestGrant = ledger.find((e) => e.type === 'monthly_grant');
    const cycleAllowance = latestGrant?.amount || 0;
    const cycleUsedPercent = cycleAllowance > 0
        ? Math.max(0, Math.min(100, ((cycleAllowance - planBalance) / cycleAllowance) * 100))
        : null;

    // Most recent expiry event — plan credits either expired at a cycle
    // renewal (unused leftover) or immediately because the plan lapsed.
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
                            <p className="text-sm font-medium">{Math.abs(latestExpiry.amount)} plan credit{Math.abs(latestExpiry.amount) === 1 ? '' : 's'} expired</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{latestExpiry.description}</p>
                        </div>
                    </div>
                )}

                {/* The two credit types — always shown as two distinct lines, since they behave completely differently */}
                <div className="space-y-3">
                    {/* Line 1: Plan credits */}
                    <div className="rounded-xl border-2 p-4 space-y-2.5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                                    <CalendarClock className="w-4.5 h-4.5" />
                                </div>
                                <div>
                                    <p className="text-lg font-black tracking-tight leading-none">{planBalance}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-0.5">Plan credits</p>
                                </div>
                            </div>
                            {planIsActive ? (
                                <Badge variant="outline" className="rounded-full text-[10px] font-semibold whitespace-nowrap">
                                    {planRefreshAt && daysUntil(planRefreshAt) === 0 ? 'Refreshes today' : `Refreshes in ${planRefreshAt ? daysUntil(planRefreshAt) : 30}d`}
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="rounded-full text-[10px] font-semibold whitespace-nowrap border-destructive/40 text-destructive">
                                    No active plan
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">Renewed every 30 days from your subscription — used first on every send. Unused credits don't roll over.</p>
                        {cycleUsedPercent !== null && (
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    <span>This cycle</span>
                                    <span>{cycleAllowance - planBalance} / {cycleAllowance} used</span>
                                </div>
                                <Progress value={cycleUsedPercent} className="h-2" />
                            </div>
                        )}
                    </div>

                    {/* Line 2: Purchased credits */}
                    <div className="rounded-xl border-2 p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <ShoppingBag className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <p className="text-lg font-black tracking-tight leading-none text-indigo-600 dark:text-indigo-400">{purchasedBalance}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-0.5">Purchased credits</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="rounded-full text-[10px] font-semibold gap-1 whitespace-nowrap">
                            <InfinityIcon className="w-3 h-3" /> Never expires
                        </Badge>
                    </div>

                    {reserved > 0 && (
                        <p className="text-xs text-muted-foreground text-center">{reserved} credit{reserved === 1 ? '' : 's'} currently held for an in-progress campaign send.</p>
                    )}
                </div>

                {/* Recent activity */}
                {!compact && recentActivity.length > 0 && (
                    <div className="space-y-2 pt-1 border-t">
                        <div className="flex items-center justify-between pt-3">
                            <div className="flex items-center gap-1.5">
                                <History className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent activity</span>
                            </div>
                            {ledger.length > recentActivity.length && (
                                <button type="button" onClick={() => setHistoryOpen(true)} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                                    <Archive className="w-3 h-3" /> View full history
                                </button>
                            )}
                        </div>
                        <div className="space-y-1">
                            {recentActivity.map((entry) => (
                                <LedgerRow key={entry._id} entry={entry} />
                            ))}
                        </div>
                        {ledger.length <= recentActivity.length && ledger.length > 0 && (
                            <button type="button" onClick={() => setHistoryOpen(true)} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1">
                                <Archive className="w-3 h-3" /> View full history
                            </button>
                        )}
                    </div>
                )}
            </CardContent>

            {/* Full email credit history — every debit/grant/purchase, so a merchant can see exactly where their credits went */}
            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogContent className="max-w-2xl rounded-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Email Credit History</DialogTitle>
                        <DialogDescription>Every credit grant, purchase, send, and expiry for this store's last {ledger.length} transactions.</DialogDescription>
                    </DialogHeader>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ledger.map((entry) => {
                                const meta = LEDGER_META[entry.type] || LEDGER_META.correction;
                                return (
                                    <TableRow key={entry._id}>
                                        <TableCell>
                                            <Badge variant="outline" className="rounded-full text-[10px] font-semibold whitespace-nowrap">{meta.label}</Badge>
                                        </TableCell>
                                        <TableCell className={cn('font-semibold whitespace-nowrap', entry.amount > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                                            {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{entry.description}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(entry.createdAt).toLocaleString()}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function LedgerRow({ entry }: { entry: EmailLedgerEntry }) {
    const meta = LEDGER_META[entry.type] || LEDGER_META.correction;
    const Icon = meta.icon;
    return (
        <div className="flex items-center gap-2.5 py-1.5 text-sm">
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
            <span className={cn('font-semibold shrink-0', entry.amount > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
            </span>
        </div>
    );
}
