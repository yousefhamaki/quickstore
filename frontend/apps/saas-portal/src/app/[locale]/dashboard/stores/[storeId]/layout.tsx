'use client';

import { use } from "react";
import { useStore } from "@shared/lib/hooks/useStore";
import { useStores } from "@shared/lib/hooks/useStores";
import { useAuth } from "@shared/context/AuthContext";
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    Settings,
    BarChart2,
    Globe,
    Truck,
    CreditCard,
    ChevronLeft,
    ChevronDown,
    Store as StoreIcon,
    Check,
    Plus,
    Palette,
    Megaphone,
    LogOut,
    ShieldCheck,
    Zap,
    Tags,
    Star,
    HandCoins,
    Mail,
    MessageCircle,
    UsersRound
} from "lucide-react";
import { NavLink, useSafeNavigation } from "@shared/components/NavLink";
import { SetupProgressBanner } from "@shared/components/dashboard/SetupProgressBanner";
import { usePathname } from "next/navigation";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@shared/components/ui/dropdown-menu";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface StoreLayoutProps {
    children: React.ReactNode;
    params: Promise<{ storeId: string }>;
}

export default function StoreLayout({ children, params }: StoreLayoutProps) {
    const t = useTranslations('merchant.storeDashboard.nav');
    const { storeId } = use(params);
    const pathname = usePathname();
    const { navigate } = useSafeNavigation();
    const { data: store } = useStore(storeId);
    const { data: stores } = useStores();
    const { logout } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    // Store settings (payment, shipping, policies, ...) are manager-level —
    // a plain 'staff' member can't save any of them (backend 403s), so don't
    // show a nav full of pages that only end in an error for that role.
    // Same reasoning for analytics/marketing/offers below (also
    // manager-and-up, see the backend's requireStoreRole(['owner','manager'])
    // gate on analytics and the in-controller checks on marketing/offers).
    const currentUserRole = store?.currentUserRole || 'owner';
    const isOwner = currentUserRole === 'owner';
    const canManageSettings = currentUserRole !== 'staff';
    const isManagerOrAbove = currentUserRole !== 'staff';

    const navigation = [
        { name: t('items.dashboard'), href: `/dashboard/stores/${storeId}`, icon: LayoutDashboard },
        { name: t('items.products'), href: `/dashboard/stores/${storeId}/products`, icon: Package },
        { name: 'Categories', href: `/dashboard/stores/${storeId}/categories`, icon: Tags },
        { name: t('items.orders'), href: `/dashboard/stores/${storeId}/orders`, icon: ShoppingCart },
        { name: 'Refund Requests', href: `/dashboard/stores/${storeId}/refund-requests`, icon: HandCoins },
        { name: t('items.customers'), href: `/dashboard/stores/${storeId}/customers`, icon: Users },
        { name: 'Reviews', href: `/dashboard/stores/${storeId}/reviews`, icon: Star },
        ...(isManagerOrAbove ? [
            { name: t('items.marketing'), href: `/dashboard/stores/${storeId}/marketing`, icon: Megaphone },
            { name: 'Offers', href: `/dashboard/stores/${storeId}/offers`, icon: Zap, badge: 'PRO' },
            { name: t('items.analytics'), href: `/dashboard/stores/${storeId}/analytics`, icon: BarChart2 },
        ] : []),
    ];

    const settingsLinks = canManageSettings ? [
        { name: t('items.general'), href: `/dashboard/stores/${storeId}/settings/general`, icon: Settings },
        { name: t('items.appearance'), href: `/dashboard/stores/${storeId}/settings/theme`, icon: Palette },
        { name: t('items.payments'), href: `/dashboard/stores/${storeId}/settings/payments`, icon: CreditCard },
        { name: t('items.shipping'), href: `/dashboard/stores/${storeId}/settings/shipping`, icon: Truck },
        { name: t('items.domain'), href: `/dashboard/stores/${storeId}/settings/domain`, icon: Globe },
        { name: t('items.policies'), href: `/dashboard/stores/${storeId}/settings/policies`, icon: ShieldCheck },
        { name: t('items.emails'), href: `/dashboard/stores/${storeId}/settings/emails`, icon: Mail },
        { name: t('items.whatsapp'), href: `/dashboard/stores/${storeId}/settings/whatsapp`, icon: MessageCircle, badge: 'SOON' },
        // Team management is owner-only (see requireStoreRole(['owner']) on
        // the backend's staff routes) — only ever shown to the owner.
        ...(isOwner ? [{ name: 'Team', href: `/dashboard/stores/${storeId}/settings/staff`, icon: UsersRound }] : []),
    ] : [];

    // `pathname` (from next/navigation) still carries the /en or /ar locale
    // prefix that these hrefs never include, so strip it before comparing —
    // otherwise every nav item always reads as inactive.
    const normalizedPathname = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '');
    // The store-root Dashboard href is a path prefix of every other nav item
    // here, so it needs an exact match — otherwise it'd stay highlighted
    // alongside whichever sub-page is actually active.
    const storeRootHref = `/dashboard/stores/${storeId}`;
    const isActive = (href: string) => href === storeRootHref
        ? normalizedPathname === href
        : normalizedPathname === href || normalizedPathname.startsWith(href + '/');

    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 border-r hidden md:flex flex-col bg-gradient-to-b from-muted/30 via-muted/10 to-muted/30 sticky top-0 h-screen overflow-y-auto">
                <div className="p-4 border-b bg-gradient-to-br from-primary/[0.03] to-transparent">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full h-14 justify-start px-2.5 hover:bg-muted/60 transition-all duration-300 rounded-2xl border border-transparent hover:border-border hover:shadow-sm">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-sm mr-3 shadow-md shadow-primary/20">
                                    {store?.name?.charAt(0).toUpperCase() || "S"}
                                </div>
                                <div className="flex-1 text-left overflow-hidden">
                                    <p className="text-sm font-bold truncate leading-none mb-1">{store?.name}</p>
                                    <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest leading-none">
                                        {store?.status}
                                    </p>
                                </div>
                                <ChevronDown className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 rounded-xl shadow-2xl">
                            <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-2">{t('storeSettings')}</DropdownMenuLabel>
                            {stores?.map((s) => (
                                <DropdownMenuItem
                                    key={s._id}
                                    onClick={() => navigate(`/dashboard/stores/${s._id}`)}
                                    className="rounded-lg mb-1 py-2 cursor-pointer flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold">
                                            {s.name.charAt(0)}
                                        </div>
                                        <span className="truncate">{s.name}</span>
                                    </div>
                                    {s._id === storeId && <Check className="w-4 h-4 text-primary" />}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => navigate('/dashboard/stores/new')}
                                className="rounded-lg py-2 cursor-pointer text-primary font-bold"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {t('createNewStore')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => navigate('/dashboard')}
                                className="rounded-lg py-2 cursor-pointer flex items-center text-muted-foreground"
                            >
                                <ChevronLeft className="w-4 h-4 mr-2" />
                                {t('allDashboards')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex-1 p-4 space-y-8">
                    <nav className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-3 ml-3 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                            {t('mainMenu')}
                        </p>
                        {navigation.map((item) => (
                            <NavLink
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center justify-between px-3 py-2.5 rounded-2xl transition-all duration-300 group font-medium text-sm",
                                    isActive(item.href)
                                        ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:translate-x-0.5"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-300",
                                        isActive(item.href) ? "bg-white/20" : "group-hover:bg-muted"
                                    )}>
                                        <item.icon className={cn(
                                            "w-4 h-4",
                                            isActive(item.href) ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                                        )} />
                                    </div>
                                    {item.name}
                                </div>
                                {item.badge && (
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm">
                                        {item.badge}
                                    </span>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    {settingsLinks.length > 0 && (
                    <nav className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-3 ml-3 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                            {t('storeSettings')}
                        </p>
                        {settingsLinks.map((item) => (
                            <NavLink
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center justify-between px-3 py-2.5 rounded-2xl transition-all duration-300 group font-medium text-sm",
                                    isActive(item.href)
                                        ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:translate-x-0.5"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-300",
                                        isActive(item.href) ? "bg-white/20" : "group-hover:bg-muted"
                                    )}>
                                        <item.icon className={cn(
                                            "w-4 h-4",
                                            isActive(item.href) ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                                        )} />
                                    </div>
                                    {item.name}
                                </div>
                                {item.badge && (
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm">
                                        {item.badge}
                                    </span>
                                )}
                            </NavLink>
                        ))}
                    </nav>
                    )}
                </div>

                <div className="p-4 border-t mt-auto space-y-2 bg-gradient-to-t from-muted/30 to-transparent">
                    <Button variant="outline" className="w-full justify-start rounded-2xl h-12 hover:shadow-sm transition-all duration-300" asChild>
                        <NavLink href="/dashboard">
                            <StoreIcon className="w-4 h-4 mr-2" />
                            {t('storeManager')}
                        </NavLink>
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start rounded-2xl h-12 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
                        onClick={() => {
                            if (confirm(t('logoutConfirm'))) {
                                logout();
                            }
                        }}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        {t('logout')}
                    </Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Nav could be added here */}
                <SetupProgressBanner storeId={storeId} />
                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}
