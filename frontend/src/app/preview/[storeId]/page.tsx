'use client';

import { use } from "react";
import { useStore, usePublishStore } from "@/lib/hooks/useStore";
import { Button } from "@/components/ui/button";
import {
    Rocket,
    ChevronLeft,
    Monitor,
    Smartphone,
    Tablet,
    ExternalLink,
    Eye,
    Loader2,
    Lock,
    Plus
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { PublishModal } from "@/components/dashboard/PublishModal";
import { useStoreChecklist } from "@/lib/hooks/useStoreChecklist";

export default function StorePreview({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading } = useStore(storeId);
    const { data: checklist } = useStoreChecklist(storeId);
    const publishMutation = usePublishStore(storeId);

    const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    if (!store) return <div className="p-12 text-center">Store not found.</div>;

    const liveUrl = `https://${store.domain.subdomain}.quickstore.com`;

    return (
        <div className="h-screen flex flex-col bg-muted/40 overflow-hidden">
            {/* Top Preview Bar */}
            <header className="h-16 bg-background border-b z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <Button asChild variant="ghost" size="sm" className="rounded-full">
                        <Link href={`/dashboard/stores/${storeId}`}>
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Back
                        </Link>
                    </Button>
                    <div className="h-8 w-px bg-muted" />
                    <div className="flex flex-col">
                        <h1 className="text-sm font-bold leading-none">{store.name}</h1>
                        <p className="text-[10px] text-muted-foreground font-mono mt-1">{store.domain.subdomain}.quickstore.com</p>
                    </div>
                    <StatusBadge status={store.status} className="ml-2 scale-90" />
                </div>

                {/* Viewport Switcher */}
                <div className="hidden md:flex items-center gap-1 bg-muted p-1 rounded-full">
                    {(['desktop', 'tablet', 'mobile'] as const).map((mode) => (
                        <Button
                            key={mode}
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-8 w-8 rounded-full transition-all",
                                viewMode === mode && "bg-background shadow-sm text-primary"
                            )}
                            onClick={() => setViewMode(mode)}
                        >
                            {mode === 'desktop' && <Monitor className="w-4 h-4" />}
                            {mode === 'tablet' && <Tablet className="w-4 h-4" />}
                            {mode === 'mobile' && <Smartphone className="w-4 h-4" />}
                        </Button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    {store.status === 'draft' ? (
                        <Button
                            onClick={() => setIsPublishModalOpen(true)}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 rounded-full px-6 shadow-lg shadow-emerald-500/20"
                        >
                            <Rocket className="w-4 h-4 mr-2" />
                            Launch Store
                        </Button>
                    ) : (
                        <Button asChild size="sm" variant="outline" className="rounded-full">
                            <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Live Store
                            </a>
                        </Button>
                    )}
                </div>
            </header>

            {/* Preview Info Banner (only for Draft) */}
            {store.status === 'draft' && (
                <div className="bg-primary text-primary-foreground py-2 px-4 flex items-center justify-center gap-3 text-xs font-bold tracking-wide">
                    <Lock className="w-3.5 h-3.5" />
                    THIS IS A SECURE PREVIEW. CUSTOMERS CANNOT SEE THIS YET.
                    <div className="h-3 w-px bg-primary-foreground/30 mx-1" />
                    <Link href={`/dashboard/stores/${storeId}`} className="underline hover:no-underline">Complete setup to publish</Link>
                </div>
            )}

            {/* Main Preview Container */}
            <div className="flex-1 overflow-auto p-4 md:p-8 flex items-center justify-center">
                <div
                    className={cn(
                        "bg-background shadow-2xl transition-all duration-500 overflow-y-auto relative border custom-scrollbar",
                        viewMode === 'desktop' && "w-full max-w-[1400px] h-full rounded-xl",
                        viewMode === 'tablet' && "w-[768px] h-[1024px] max-h-full rounded-[40px] border-[12px] border-slate-900",
                        viewMode === 'mobile' && "w-[375px] h-[812px] max-h-full rounded-[48px] border-[16px] border-slate-900"
                    )}
                >
                    {/* Iframe or Mock View */}
                    {/* Preview Viewport Content */}
                    <div className="w-full min-h-full flex flex-col">
                        {/* Mock Nav */}
                        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-10" style={{ fontFamily: store.branding.fontFamily }}>
                            <Link href={`/dashboard/stores/${storeId}/settings/theme`} className="hover:opacity-75 transition-opacity">
                                <h2 className="text-xl font-bold" style={{ color: store.branding.primaryColor }}>{store.name}</h2>
                            </Link>
                            <div className="flex gap-4 text-sm font-medium">
                                <Link href={`/dashboard/stores/${storeId}/products`} className="hover:text-primary transition-colors">Shop</Link>
                                <Link href={`/dashboard/stores/${storeId}/settings/policies`} className="hover:text-primary transition-colors">Policies</Link>
                                <Link href={`/dashboard/stores/${storeId}/settings/general`} className="hover:text-primary transition-colors">Contact</Link>
                            </div>
                        </div>

                        {/* Mock Hero */}
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6" style={{ fontFamily: store.branding.fontFamily }}>
                            <div className="space-y-4">
                                <h3 className="text-5xl font-black leading-tight tracking-tight animate-in fade-in slide-in-from-top-8 duration-700">
                                    Welcome to <br />
                                    <span style={{ color: store.branding.primaryColor }}>{store.name}</span>
                                </h3>
                                <p className="text-muted-foreground text-lg max-w-lg mx-auto animate-in fade-in slide-in-from-top-4 delay-200 duration-700">
                                    {store.description || "The best products curated just for you. Quality and trust in every order."}
                                </p>
                            </div>

                            <Button
                                asChild
                                size="lg"
                                className="rounded-full px-12 h-14 text-lg font-bold shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                style={{ backgroundColor: store.branding.primaryColor }}
                            >
                                <Link href={`/dashboard/stores/${storeId}/products`}>
                                    Start Shopping
                                </Link>
                            </Button>

                            <div className="pt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} className="aspect-[3/4] bg-muted rounded-3xl p-4 flex flex-col justify-end text-left border overflow-hidden group/product cursor-help">
                                        <div className="bg-background/80 backdrop-blur p-4 rounded-2xl transform translate-y-4 group-hover/product:translate-y-0 transition-all duration-300 shadow-sm">
                                            <p className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-widest">Sample Product {i}</p>
                                            <div className="flex items-center justify-between">
                                                <p className="font-bold">EGP {(250 * i).toLocaleString()}</p>
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary/10 text-primary">
                                                    <Plus size={12} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mock Footer */}
                        <footer className="mt-20 p-12 bg-muted/30 border-t text-center space-y-4" style={{ fontFamily: store.branding.fontFamily }}>
                            <h4 className="font-bold" style={{ color: store.branding.primaryColor }}>{store.name}</h4>
                            <p className="text-xs text-muted-foreground">© 2026 {store.name}. Powered by QuickStore.</p>
                            <div className="flex justify-center gap-6">
                                <div className="w-8 h-8 rounded-full bg-muted" />
                                <div className="w-8 h-8 rounded-full bg-muted" />
                                <div className="w-8 h-8 rounded-full bg-muted" />
                            </div>
                        </footer>
                    </div>

                    <div className="absolute inset-0 bg-primary/20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>

            <PublishModal
                isOpen={isPublishModalOpen}
                onClose={() => setIsPublishModalOpen(false)}
                storeName={store.name}
                storeUrl={liveUrl}
                isReady={checklist?.progress.percentage === 100}
                missingSteps={checklist ? Object.entries(checklist.checklist).filter(([_, v]) => !v.completed).map(([_, v]) => v.label) : []}
                onConfirm={async () => {
                    await publishMutation.mutateAsync();
                    setIsPublishModalOpen(false);
                }}
            />
        </div>
    );
}
