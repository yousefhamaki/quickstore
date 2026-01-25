'use client';

import { use } from "react";
import { useStore } from "@/lib/hooks/useStore";
import { useStores } from "@/lib/hooks/useStores";
import { useAuth } from "@/context/AuthContext";
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
    ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import { useState, useEffect } from "react";

interface StoreLayoutProps {
    children: React.ReactNode;
    params: Promise<{ storeId: string }>;
}

export default function StoreLayout({ children, params }: StoreLayoutProps) {
    const { storeId } = use(params);
    const pathname = usePathname();
    const router = useRouter();
    const { data: store } = useStore(storeId);
    const { data: stores } = useStores();
    const { logout } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const navigation = [
        { name: 'Dashboard', href: `/dashboard/stores/${storeId}`, icon: LayoutDashboard },
        { name: 'Products', href: `/dashboard/stores/${storeId}/products`, icon: Package },
        { name: 'Orders', href: `/dashboard/stores/${storeId}/orders`, icon: ShoppingCart },
        { name: 'Customers', href: `/dashboard/stores/${storeId}/customers`, icon: Users },
        { name: 'Marketing', href: `/dashboard/stores/${storeId}/marketing`, icon: Megaphone },
        { name: 'Analytics', href: `/dashboard/stores/${storeId}/analytics`, icon: BarChart2 },
    ];

    const settingsLinks = [
        { name: 'General', href: `/dashboard/stores/${storeId}/settings/general`, icon: Settings },
        { name: 'Appearance', href: `/dashboard/stores/${storeId}/settings/theme`, icon: Palette },
        { name: 'Payments', href: `/dashboard/stores/${storeId}/settings/payments`, icon: CreditCard },
        { name: 'Shipping', href: `/dashboard/stores/${storeId}/settings/shipping`, icon: Truck },
        { name: 'Domain', href: `/dashboard/stores/${storeId}/settings/domain`, icon: Globe },
        { name: 'Policies', href: `/dashboard/stores/${storeId}/settings/policies`, icon: ShieldCheck },
    ];

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 border-r hidden md:flex flex-col bg-muted/20 sticky top-0 h-screen overflow-y-auto">
                <div className="p-4 border-b">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full h-12 justify-start px-2 hover:bg-muted/50 transition-all rounded-xl border border-transparent hover:border-border">
                                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm mr-3">
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
                            <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-2">My Stores</DropdownMenuLabel>
                            {stores?.map((s) => (
                                <DropdownMenuItem
                                    key={s._id}
                                    onClick={() => router.push(`/dashboard/stores/${s._id}`)}
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
                                onClick={() => router.push('/dashboard/stores/new')}
                                className="rounded-lg py-2 cursor-pointer text-primary font-bold"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create New Store
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => router.push('/dashboard')}
                                className="rounded-lg py-2 cursor-pointer flex items-center text-muted-foreground"
                            >
                                <ChevronLeft className="w-4 h-4 mr-2" />
                                All Dashboards
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex-1 p-4 space-y-8">
                    <nav className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 ml-2">Main Menu</p>
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group font-medium text-sm",
                                    isActive(item.href)
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-4 h-4",
                                    isActive(item.href) ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                                )} />
                                {item.name}
                            </Link>
                        ))}
                    </nav>

                    <nav className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 ml-2">Store Settings</p>
                        {settingsLinks.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group font-medium text-sm",
                                    isActive(item.href)
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-4 h-4",
                                    isActive(item.href) ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                                )} />
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="p-4 border-t mt-auto space-y-2">
                    <Button variant="outline" className="w-full justify-start rounded-xl h-12" asChild>
                        <Link href="/dashboard">
                            <StoreIcon className="w-4 h-4 mr-2" />
                            Store Manager
                        </Link>
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start rounded-xl h-12 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                            if (confirm('Are you sure you want to logout?')) {
                                logout();
                            }
                        }}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Mobile Nav could be added here */}
                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}
