'use client';

import { useWallet } from "@/context/WalletContext";
import { ArrowUpRight, Clock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BillingBanner() {
    const { billing, blockingReason } = useWallet();

    if (!billing || !blockingReason) return null;

    const isExpired = blockingReason === 'SUBSCRIPTION_EXPIRED';

    return (
        <div className={cn(
            "w-full px-6 py-3 border-b-2 flex items-center justify-between gap-4 animate-in slide-in-from-top-full duration-500 sticky top-0 z-[60] shadow-lg",
            isExpired ? "bg-red-600/95 backdrop-blur-md border-red-700 text-white" : "bg-amber-500/95 backdrop-blur-md border-amber-600 text-white"
        )}>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                    {isExpired ? <ShieldAlert className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div>
                    <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">
                        {isExpired ? "CRITICAL: Service Suspension" : "Action Required: Low Wallet"}
                    </p>
                    <p className="text-sm font-bold opacity-95">
                        {isExpired
                            ? "Your subscription has expired. Customer orders are currently blocked. Renew now to resume."
                            : `Your balance (${billing.wallet.balance} EGP) is below requirements. Recharge to keep your store public.`}
                    </p>
                </div>
            </div>

            <Button
                asChild
                variant="secondary"
                size="sm"
                className="rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all text-foreground h-9"
            >
                <Link href="/merchant/billing">
                    {isExpired ? "Renew Plan" : "Recharge Wallet"}
                    <ArrowUpRight className="w-3 h-3 ml-2" />
                </Link>
            </Button>
        </div>
    );
}
