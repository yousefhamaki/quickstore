'use client';

import { useEffect, useState } from 'react';
import {
    MessageCircle,
    Loader2,
    Ban,
    AlertTriangle,
    Lock,
    TrendingUp,
    Wrench,
    TimerOff,
    History,
    ShieldCheck,
    Archive,
    ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Progress } from '@shared/components/ui/progress';
import { Badge } from '@shared/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@shared/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { cn } from '@shared/lib/utils';
import { getWhatsAppAccountBalance, WhatsAppLedgerEntry } from '@shared/services/whatsappService';

interface WhatsAppCreditsPanelProps {
    storeId: string;
    /** Shown when the plan doesn't include WhatsApp (or has no active plan at all) — wire to your billing/upgrade page. */
    onUpgradePlan?: () => void;
    refreshToken?: number | string;
    compact?: boolean;
    onBalanceChange?: (balance: number | null) => void;
    /** Fired whenever the plan's WhatsApp feature-inclusion status loads/changes — lets the host page gate its own connection UI without a second fetch. */
    onFeatureIncludedChange?: (included: boolean) => void;
}

const LEDGER_META: Record<WhatsAppLedgerEntry['type'], { icon: any; label: string; tone: 'positive' | 'negative' | 'neutral' }> = {
    monthly_grant: { icon: TrendingUp, label: 'Plan grant', tone: 'positive' },
    purchase: { icon: TrendingUp, label: 'Purchased', tone: 'positive' },
    transactional_debit: { icon: MessageCircle, label: 'Message sent', tone: 'negative' },
    correction: { icon: Wrench, label: 'Correction', tone: 'neutral' },
    expired: { icon: TimerOff, label: 'Expired', tone: 'negative' },
};

function daysUntil(iso: string): number {
    return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

/**
 * WhatsApp's credits widget — deliberately NOT symmetrical with
 * EmailCreditsPanel's plan+purchased two-line design, because WhatsApp has
 * no purchasable add-on: on the unofficial (Baileys) connection a message
 * costs Buildora nothing, so there's no real per-message cost to charge
 * for, and no "buy more" mechanic exists. Access and volume are entirely
 * plan-gated instead (SubscriptionPlan.features.allowWhatsApp +
 * whatsappLimit) — the limit is a genuine SAFETY cap (higher volume on one
 * unofficial number raises WhatsApp ban risk), not a monetized meter, so
 * it's always shown, always a finite number, and scales with plan tier.
 */
export function WhatsAppCreditsPanel({ storeId, onUpgradePlan, refreshToken, compact, onBalanceChange, onFeatureIncludedChange }: WhatsAppCreditsPanelProps) {
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState<number | null>(null);
    const [planBalance, setPlanBalance] = useState(0);
    const [reserved, setReserved] = useState(0);
    const [planIsActive, setPlanIsActive] = useState(false);
    const [featureIncluded, setFeatureIncluded] = useState(false);
    const [planRefreshAt, setPlanRefreshAt] = useState<string | null>(null);
    const [ledger, setLedger] = useState<WhatsAppLedgerEntry[]>([]);
    const [historyOpen, setHistoryOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getWhatsAppAccountBalance(storeId)
            .then((res) => {
                if (cancelled) return;
                setBalance(res.balance);
                setPlanBalance(res.planBalance || 0);
                setReserved(res.reserved || 0);
                setPlanIsActive(!!res.planIsActive);
                setFeatureIncluded(!!res.featureIncluded);
                setPlanRefreshAt(res.planRefreshAt || null);
                setLedger(res.ledgerHistory || []);
                onBalanceChange?.(res.balance);
                onFeatureIncludedChange?.(!!res.featureIncluded);
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
        return null;
    }

    // Not included in the current plan at all — a locked upsell state,
    // distinct from "included but currently at 0 for this cycle."
    if (!featureIncluded) {
        return (
            <Card className="border-2 border-dashed shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-semibold">
                                {planIsActive ? 'WhatsApp is not included in your current plan' : 'No active subscription'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {planIsActive
                                    ? 'Upgrade to a plan with WhatsApp support to connect a number and start sending order updates.'
                                    : 'Subscribe to a plan that includes WhatsApp to use this feature.'}
                            </p>
                        </div>
                    </div>
                    {onUpgradePlan && (
                        <Button type="button" className="rounded-xl gap-2" onClick={onUpgradePlan}>
                            Upgrade plan <ArrowUpRight className="w-4 h-4" />
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    }

    const isZeroBalance = balance <= 0;
    const isLowBalance = balance > 0 && balance < 10;

    const latestGrant = ledger.find((e) => e.type === 'monthly_grant');
    const cycleAllowance = latestGrant?.amount || 0;
    const cycleUsedPercent = cycleAllowance > 0
        ? Math.max(0, Math.min(100, ((cycleAllowance - planBalance) / cycleAllowance) * 100))
        : null;

    const latestExpiry = ledger.find((e) => e.type === 'expired');
    const recentActivity = ledger.slice(0, 6);

    return (
        <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                            <MessageCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-3xl font-black tracking-tight leading-none">{planBalance}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">Messages remaining this cycle</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="rounded-full text-[10px] font-semibold gap-1.5 whitespace-nowrap">
                        <ShieldCheck className="w-3 h-3" /> Safety cap — included with your plan
                    </Badge>
                </div>

                {isZeroBalance && (
                    <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-3.5 flex items-start gap-3">
                        <Ban className="w-4.5 h-4.5 text-destructive mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-destructive">Monthly WhatsApp limit reached</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Customer WhatsApp messages will not send until your limit refreshes — you'll be alerted by email instead. {onUpgradePlan ? 'Upgrade for a higher monthly limit.' : ''}</p>
                        </div>
                    </div>
                )}
                {isLowBalance && (
                    <div className="rounded-xl border-2 border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 p-3.5 flex items-start gap-3">
                        <AlertTriangle className="w-4.5 h-4.5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Only {balance} message{balance === 1 ? '' : 's'} left this cycle</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Your limit refreshes automatically — no action needed unless you want a higher cap sooner.</p>
                        </div>
                    </div>
                )}
                {latestExpiry && (
                    <div className="rounded-xl border bg-muted/30 p-3.5 flex items-start gap-3">
                        <TimerOff className="w-4.5 h-4.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-medium">{Math.abs(latestExpiry.amount)} unused message{Math.abs(latestExpiry.amount) === 1 ? '' : 's'} expired</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{latestExpiry.description}</p>
                        </div>
                    </div>
                )}

                <div className="rounded-xl border-2 p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monthly limit</span>
                        <Badge variant="outline" className="rounded-full text-[10px] font-semibold whitespace-nowrap">
                            {planRefreshAt && daysUntil(planRefreshAt) === 0 ? 'Refreshes today' : `Refreshes in ${planRefreshAt ? daysUntil(planRefreshAt) : 30}d`}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        This cap exists to keep your WhatsApp number safe — sending too many messages too fast is what gets unofficial WhatsApp connections banned. Higher plans get a higher monthly limit. Unused messages don't roll over.
                    </p>
                    {cycleUsedPercent !== null && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                <span>This cycle</span>
                                <span>{cycleAllowance - planBalance} / {cycleAllowance} used</span>
                            </div>
                            <Progress value={cycleUsedPercent} className="h-2" />
                        </div>
                    )}
                    {reserved > 0 && (
                        <p className="text-xs text-muted-foreground">{reserved} message{reserved === 1 ? '' : 's'} currently held.</p>
                    )}
                </div>

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

            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogContent className="max-w-2xl rounded-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>WhatsApp Message History</DialogTitle>
                        <DialogDescription>Every grant, send, and expiry for this store's last {ledger.length} transactions.</DialogDescription>
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

function LedgerRow({ entry }: { entry: WhatsAppLedgerEntry }) {
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
