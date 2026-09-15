'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { User, Package, MapPin, LogOut } from "lucide-react";
import { useCustomerAuth } from "@shared/context/CustomerAuthContext";
import { cn } from "@shared/lib/utils";

export function AccountNav({ primaryColor }: { primaryColor: string }) {
    const t = useTranslations('store.account.nav');
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useCustomerAuth();

    // pathname is the FULL path (e.g. /en/store/hamaki/account/orders) — match
    // on the trailing segment rather than trying to reconstruct the base path.
    const isActive = (segment: string) => {
        if (segment === '') return pathname.endsWith('/account');
        return pathname.includes(`/account/${segment}`);
    };

    const items = [
        { href: '/account', segment: '', icon: User, label: t('overview') },
        { href: '/account/orders', segment: 'orders', icon: Package, label: t('orders') },
        { href: '/account/addresses', segment: 'addresses', icon: MapPin, label: t('addresses') },
    ];

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    return (
        <nav className="flex flex-col gap-1">
            {items.map((item) => {
                const active = isActive(item.segment);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-colors",
                            active ? "text-white" : "text-gray-500 hover:bg-gray-100"
                        )}
                        style={active ? { backgroundColor: primaryColor } : undefined}
                    >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                    </Link>
                );
            })}
            <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
            >
                <LogOut className="w-4 h-4" />
                {t('logout')}
            </button>
        </nav>
    );
}
