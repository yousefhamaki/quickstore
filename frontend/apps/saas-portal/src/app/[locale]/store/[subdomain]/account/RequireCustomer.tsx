'use client';

import { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useCustomerAuth } from "@shared/context/CustomerAuthContext";
import { Button } from "@shared/components/ui/button";

/**
 * Gates a protected /account/* page: shows a spinner while the session is
 * being resolved, a "please log in" prompt when there is no customer, and
 * the page content otherwise. Login/register pages don't use this — only
 * pages that need a logged-in customer (overview, orders, addresses).
 */
export function RequireCustomer({ primaryColor, children }: { primaryColor: string; children: ReactNode }) {
    const t = useTranslations('store.account');
    const { customer, isLoading } = useCustomerAuth();

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: primaryColor }} />
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="container mx-auto px-4 py-32 max-w-md text-center space-y-6">
                <p className="text-gray-500 font-medium">{t('loginRequired')}</p>
                <Button asChild className="rounded-2xl h-12 px-8 font-black text-sm uppercase tracking-widest" style={{ backgroundColor: primaryColor }}>
                    <Link href="/account/login">{t('goToLogin')}</Link>
                </Button>
            </div>
        );
    }

    return <>{children}</>;
}
