'use client';

import React, { memo, useMemo } from 'react';
import { NavLink } from '@/components/NavLink';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, ShoppingBag, ShoppingCart, Settings, LayoutTemplate, Wallet, Zap, Store } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Memoized NavItem to prevent re-renders
const NavItem = memo(({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) => {
    return (
        <NavLink href={href} className="block w-full">
            <div className={`w-full flex items-center space-x-3 rtl:space-x-reverse px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-medium'}`}>
                {icon}
                <span className="font-bold">{label}</span>
            </div>
        </NavLink>
    );
});
NavItem.displayName = 'NavItem';

// Memoized user section
const UserSection = memo(({ user, onLogout, logoutText }: { user: any, onLogout: () => void, logoutText: string }) => (
    <div className="p-4 border-t space-y-3">
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center space-x-3 rtl:space-x-reverse">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0)}
            </div>
            <div className="overflow-hidden flex-1">
                <p className="text-sm font-bold truncate">{user?.name}</p>
                <p className="text-xs text-blue-600 font-medium">Merchant</p>
            </div>
        </div>
        <button
            onClick={onLogout}
            className="w-full px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm transition-colors"
        >
            {logoutText}
        </button>
    </div>
));
UserSection.displayName = 'UserSection';

function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const t = useTranslations('dashboard');
    const tCommon = useTranslations('common');

    // Memoize nav items to prevent recreation on every render
    const navItems = useMemo(() => [
        { icon: <LayoutDashboard size={20} />, label: t('sidebar.dashboard'), href: "/merchant" },
        { icon: <Store size={20} />, label: t('sidebar.myStores'), href: "/dashboard" },
        { icon: <LayoutTemplate size={20} />, label: t('sidebar.themeBuilder'), href: "/merchant/theme" },
        { icon: <Wallet size={20} />, label: t('sidebar.billing'), href: "/merchant/billing" },
        { icon: <Zap size={20} />, label: t('sidebar.upgradePlans'), href: "/merchant/plans" },
        { icon: <Settings size={20} />, label: t('sidebar.settings'), href: "/merchant/settings" },
    ], [t]);

    const handleLogout = () => {
        if (confirm(t('sidebar.logoutConfirm'))) {
            logout();
        }
    };

    return (
        <aside className="w-64 bg-white border-r hidden md:flex flex-col h-full sticky top-0">
            <div className="p-6 border-b">
                <NavLink href="/merchant" className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className="relative h-8 w-8 flex-shrink-0">
                        <Image
                            src="/logo.png"
                            alt="Buildora Logo"
                            width={32}
                            height={32}
                            className="object-contain"
                            priority
                        />
                    </div>
                    <h2 className="text-2xl font-black text-blue-600 tracking-tighter cursor-pointer">{tCommon('brand.name').toUpperCase()}</h2>
                </NavLink>
                <p className="text-xs text-gray-400 font-bold uppercase mt-1">{t('sidebar.merchantPanel')}</p>
            </div>
            <nav className="flex-grow p-4 space-y-2">
                {navItems.map((item) => (
                    <NavItem
                        key={item.href}
                        icon={item.icon}
                        label={item.label}
                        href={item.href}
                        active={pathname === item.href || (item.href !== '/merchant' && pathname.startsWith(item.href))}
                    />
                ))}
            </nav>
            <UserSection user={user} onLogout={handleLogout} logoutText={t('sidebar.logout')} />
        </aside>
    );
}

// Export memoized version to prevent re-renders when parent re-renders
export default memo(Sidebar);
