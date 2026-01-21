'use client';

import { useWallet } from "@/context/WalletContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Wallet, AlertTriangle } from "lucide-react";
import Link from "next/link";

export function BillingGuardModal({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { billing, blockingReason } = useWallet();

    if (!billing || !blockingReason) return null;

    let title = "Action Blocked";
    let description = "You need to update your account status to perform this action.";
    let icon = <AlertTriangle className="w-12 h-12 text-amber-500" />;
    let actionLabel = "Go to Billing";
    let actionHref = "/merchant/billing";

    if (blockingReason === 'SUBSCRIPTION_EXPIRED') {
        title = "Subscription Expired";
        description = "Your subscription has expired or is past due. Please renew your plan to continue creating orders and managing your store.";
        icon = <ShieldAlert className="w-12 h-12 text-red-500" />;
        actionLabel = "Renew Subscription";
        actionHref = "/merchant/plans";
    } else if (blockingReason === 'LOW_WALLET') {
        title = "Merchant Wallet Depleted";
        description = "Your wallet balance is below the minimum requirement or insufficient to cover the transaction fee. Please recharge to continue.";
        icon = <Wallet className="w-12 h-12 text-amber-500" />;
        actionLabel = "Recharge Wallet";
        actionHref = "/merchant/billing";
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[40px] border-2 shadow-2xl overflow-hidden max-w-md p-0">
                <div className="p-8 pb-0 flex flex-col items-center text-center space-y-4">
                    <div className="p-4 bg-muted rounded-[24px] mb-2 animate-bounce">
                        {icon}
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight">{title}</DialogTitle>
                    <DialogDescription className="text-muted-foreground font-medium text-balance">
                        {description}
                    </DialogDescription>
                </div>

                <div className="p-8 pt-6 flex flex-col gap-3">
                    <Button asChild className="h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl" variant={blockingReason === 'SUBSCRIPTION_EXPIRED' ? "destructive" : "default"}>
                        <Link href={actionHref}>
                            {actionLabel}
                        </Link>
                    </Button>
                    <Button variant="ghost" className="h-12 rounded-2xl font-bold text-muted-foreground" onClick={() => onOpenChange(false)}>
                        Maybe Later
                    </Button>
                </div>

                {/* Decorative background */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            </DialogContent>
        </Dialog>
    );
}
