'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, ShoppingBag, ShoppingCart, Settings, LayoutTemplate, Wallet, Zap } from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: "Dashboard", href: "/merchant" },
        { icon: <ShoppingBag size={20} />, label: "Products", href: "/merchant/products" },
        { icon: <ShoppingCart size={20} />, label: "Orders", href: "/merchant/orders" },
        { icon: <LayoutTemplate size={20} />, label: "Theme Builder", href: "/merchant/theme" },
        { icon: <Wallet size={20} />, label: "Billing & Wallet", href: "/merchant/billing" },
        { icon: <Zap size={20} />, label: "Upgrade Plans", href: "/merchant/plans" },
        { icon: <Settings size={20} />, label: "Settings", href: "/merchant/settings" },
    ];

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            logout();
        }
    };

    return (
        <aside className="w-64 bg-white border-r hidden md:flex flex-col h-full sticky top-0">
            <div className="p-6 border-b">
                <Link href="/merchant">
                    <h2 className="text-2xl font-black text-blue-600 tracking-tighter cursor-pointer">BUILDORA</h2>
                </Link>
                <p className="text-xs text-gray-400 font-bold uppercase mt-1">Merchant Panel</p>
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
            <div className="p-4 border-t space-y-3">
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                        {user?.name?.charAt(0)}
                    </div>
                    <div className="overflow-hidden flex-1">
                        <p className="text-sm font-bold truncate">{user?.name}</p>
                        <p className="text-xs text-blue-600 font-medium">Merchant</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm transition-colors"
                >
                    Logout
                </button>
            </div>
        </aside>
    );
}

function NavItem({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
    return (
        <Link href={href} className="block w-full">
            <div className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-medium'}`}>
                {icon}
                <span className="font-bold">{label}</span>
            </div>
        </Link>
    );
}
