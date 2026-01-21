'use client';

import { useBillingOverview, useRechargeWallet, useTransactions } from "@/lib/hooks/useBilling";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Wallet,
    ArrowUpRight,
    Clock,
    ShieldCheck,
    AlertCircle,
    Download,
    Zap,
    ChevronLeft,
    ChevronRight,
    ArrowDownLeft,
    CreditCard
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ReceiptModal } from "@/components/merchant/ReceiptModal";
import { Receipt } from "@/lib/api/billing";

export default function MerchantBillingPage() {
    const [page, setPage] = useState(1);
    const { data: billing, isLoading: overviewLoading } = useBillingOverview();
    const { data: transactionData, isLoading: transLoading } = useTransactions(page, 5);
    const rechargeMutation = useRechargeWallet();
    const [rechargeAmount, setRechargeAmount] = useState<string>("500");
    const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

    if (overviewLoading) return <BillingSkeleton />;

    if (!billing) return <div>Failed to load billing data</div>;

    const handleRecharge = () => {
        rechargeMutation.mutate(Number(rechargeAmount));
    };

    const isBlocking = !!billing.blockingReason;

    return (
        <div className="container mx-auto p-6 max-w-7xl space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Billing & Wallet</h1>
                    <p className="text-muted-foreground font-medium">Single source of truth for your financial activity.</p>
                </div>
                <div className="flex gap-3">
                    <Button asChild variant="outline" className="rounded-xl font-bold border-2 h-11">
                        <Link href="/merchant/plans">
                            <Zap className="w-4 h-4 mr-2 text-amber-500 fill-amber-500" />
                            Upgrade Plan
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Critical Alerts from backend blocking reason */}
            {isBlocking && (
                <div className={cn(
                    "p-4 rounded-2xl border-2 flex items-center gap-4 animate-in fade-in slide-in-from-top-2",
                    billing.blockingReason === 'SUBSCRIPTION_EXPIRED' ? "bg-red-50 border-red-100 text-red-900" : "bg-amber-50 border-amber-100 text-amber-900"
                )}>
                    <AlertCircle className="w-6 h-6 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-black text-sm uppercase tracking-widest">
                            {billing.blockingReason === 'SUBSCRIPTION_EXPIRED' ? "Subscription Blocked" : "Low Wallet Balance"}
                        </p>
                        <p className="text-sm font-medium opacity-80">
                            {billing.blockingReason === 'SUBSCRIPTION_EXPIRED'
                                ? `Your subscription is expired or past due. Please renew to keep your store active.`
                                : `Your balance is too low to maintain Free plan visibility. Minimum 250 EGP required.`}
                        </p>
                    </div>
                    <Button size="sm" className={billing.blockingReason === 'SUBSCRIPTION_EXPIRED' ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"} asChild>
                        <Link href={billing.blockingReason === 'SUBSCRIPTION_EXPIRED' ? "/merchant/plans" : "#recharge"}>Resolve Now</Link>
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Wallet Card */}
                <Card id="recharge" className="rounded-[32px] border-2 shadow-xl bg-primary text-primary-foreground overflow-hidden relative group">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest opacity-70">Available Balance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black">{billing.wallet.balance.toLocaleString()}</span>
                            <span className="text-xl font-bold opacity-70">{billing.wallet.currency}</span>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/10">
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    value={rechargeAmount}
                                    onChange={(e) => setRechargeAmount(e.target.value)}
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl h-11"
                                    placeholder="Amount"
                                />
                                <Button
                                    onClick={handleRecharge}
                                    disabled={rechargeMutation.isPending}
                                    className="bg-white text-primary hover:bg-white/90 rounded-xl font-black h-11 px-6 transition-all active:scale-95 shadow-lg"
                                >
                                    {rechargeMutation.isPending ? <Clock className="w-4 h-4 animate-spin" /> : <><ArrowUpRight className="w-4 h-4 mr-2" /> Recharge</>}
                                </Button>
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-tighter opacity-50">Instant recharge via Paymob Secure Gateway</p>
                        </div>
                    </CardContent>
                    <Wallet className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                </Card>

                {/* Plan Card */}
                <Card className="rounded-[32px] border-2 shadow-md flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-xl font-black tracking-tight">{billing.plan.name} Plan</CardTitle>
                                <CardDescription className="font-medium">Active Status</CardDescription>
                            </div>
                            <Badge className={cn(
                                "rounded-lg px-3 py-1 font-black uppercase text-[10px] tracking-widest italic border-none",
                                billing.subscription.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            )}>
                                {billing.subscription.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 mt-auto">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    <span>Stores Capacity</span>
                                    <span>{billing.usage.storesUsed} / {billing.usage.storeLimit === -1 ? '∞' : billing.usage.storeLimit}</span>
                                </div>
                                <Progress value={billing.usage.storeLimit === -1 ? 100 : (billing.usage.storesUsed / billing.usage.storeLimit) * 100} className="h-2" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    <span>Products Active</span>
                                    <span>{billing.usage.productsUsed} / {billing.usage.productLimit === -1 ? '∞' : billing.usage.productLimit}</span>
                                </div>
                                <Progress value={billing.usage.productLimit === -1 ? 100 : (billing.usage.productsUsed / billing.usage.productLimit) * 100} className="h-2" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Renewal Info */}
                <Card className="rounded-[32px] border-2 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xl font-black tracking-tight">Timeline</CardTitle>
                        <CardDescription className="font-medium">Subscription milestones</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4 p-3 bg-muted/40 rounded-2xl">
                            <div className="p-2 bg-white rounded-xl shadow-sm"><Clock className="w-4 h-4 text-primary" /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Next Renewal</p>
                                <p className="font-bold">{format(new Date(billing.subscription.expiresAt), 'MMMM dd, yyyy')}</p>
                            </div>
                        </div>
                        <div className="space-y-3 pt-2">
                            <FeatureCheck label="Merchant Dashboard" enabled={true} />
                            <FeatureCheck label="Dropshipping Tools" enabled={billing.plan.features.dropshipping} />
                            <FeatureCheck label="Custom Domain" enabled={billing.plan.features.customDomain} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Transaction Ledger */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-black tracking-tight">Transaction History</h2>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 rounded-lg"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || transLoading}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-xs font-black px-2">{page} / {transactionData?.pagination?.pages || 1}</span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 rounded-lg"
                            onClick={() => setPage(p => p + 1)}
                            disabled={page >= (transactionData?.pagination?.pages || 1) || transLoading}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <Card className="rounded-[40px] border-2 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/50 border-b">
                                    <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Date</th>
                                    <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Type</th>
                                    <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Reason</th>
                                    <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px] text-muted-foreground">Amount</th>
                                    <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px] text-muted-foreground">Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {transLoading ? (
                                    [...Array(3)].map((_, i) => (
                                        <tr key={i}><td colSpan={5} className="p-8"><Skeleton className="h-8 w-full" /></td></tr>
                                    ))
                                ) : (
                                    transactionData?.transactions?.map((tx) => (
                                        <tr key={tx._id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-6 py-5 font-medium opacity-70">
                                                {format(new Date(tx.createdAt), 'MMM dd, HH:mm')}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    {tx.type === 'credit' ? (
                                                        <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><ArrowDownLeft className="w-4 h-4" /></div>
                                                    ) : (
                                                        <div className="p-1.5 bg-red-100 text-red-600 rounded-lg"><ArrowUpRight className="w-4 h-4" /></div>
                                                    )}
                                                    <span className="font-black uppercase text-[10px] tracking-widest">{tx.type}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <Badge variant="outline" className="rounded-lg font-bold border-2 px-3">
                                                    {tx.reason.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className={cn(
                                                "px-6 py-5 text-right font-black text-base",
                                                tx.type === 'credit' ? "text-emerald-600" : "text-foreground"
                                            )}>
                                                {tx.type === 'credit' ? '+' : '-'}{tx.amount.toFixed(2)} {billing.wallet.currency}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                                                    onClick={() => setSelectedReceipt({
                                                        _id: tx.referenceId || tx._id,
                                                        amount: tx.amount,
                                                        currency: billing.wallet.currency,
                                                        type: tx.reason === 'recharge' ? 'wallet_recharge' : 'order',
                                                        issuedAt: tx.createdAt
                                                    })}
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                {transactionData?.transactions?.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center text-muted-foreground italic font-medium">
                                            No financial activity recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {selectedReceipt && (
                <ReceiptModal
                    receipt={selectedReceipt}
                    open={!!selectedReceipt}
                    onOpenChange={(open) => !open && setSelectedReceipt(null)}
                />
            )}
        </div>
    );
}

function FeatureCheck({ label, enabled }: { label: string; enabled: boolean }) {
    return (
        <div className={cn("flex items-center gap-2", !enabled && "opacity-30")}>
            <ShieldCheck className={cn("w-4 h-4", enabled ? "text-emerald-500" : "text-gray-400")} />
            <span className="text-xs font-bold">{label}</span>
        </div>
    );
}

function BillingSkeleton() {
    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-4 w-96" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Skeleton className="h-64 rounded-[32px]" /><Skeleton className="h-64 rounded-[32px]" /><Skeleton className="h-64 rounded-[32px]" />
            </div>
            <Skeleton className="h-[400px] rounded-[40px]" />
        </div>
    );
}
