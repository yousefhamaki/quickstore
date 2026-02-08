'use client';

import { use, useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Ticket,
    Target,
    Share2,
    Plus,
    Lock,
    Sparkles,
    Search,
    ChevronRight,
    Loader2,
    Globe
} from "lucide-react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useRouter } from "next/navigation";
import { getCoupons, Coupon } from "@/services/marketingService";
import { toast } from "sonner";

export default function MarketingPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const router = useRouter();

    // Single Feature Access Hook
    const { checkAccess, getRequiredPlan, isLoading: accessLoading } = useFeatureAccess(undefined, storeId);

    const hasCouponsAccess = checkAccess('coupons');
    const hasPixelsAccess = checkAccess('pixels');
    const hasSEOAccess = checkAccess('seo');
    const hasAbandonedCartAccess = checkAccess('abandoned_cart');
    const hasAIMarketingAccess = checkAccess('ai_marketing');

    const [couponList, setCouponList] = useState<Coupon[]>([]);
    const [loadingCoupons, setLoadingCoupons] = useState(false);

    useEffect(() => {
        if (hasCouponsAccess) {
            fetchCoupons();
        }
    }, [hasCouponsAccess, storeId]);

    const fetchCoupons = async () => {
        try {
            setLoadingCoupons(true);
            const data = await getCoupons(storeId) as any;
            setCouponList(data.coupons || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingCoupons(false);
        }
    };

    if (accessLoading) {
        return (
            <div className="p-8 space-y-8 animate-pulse">
                <div className="h-12 w-64 bg-muted rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted rounded-[2.5rem]" />)}
                </div>
            </div>
        );
    }

    const FeatureLock = ({ feature, requiredPlan }: { feature: string, requiredPlan: string }) => (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <Lock className="w-6 h-6" />
            </div>
            <h4 className="font-black uppercase tracking-tighter text-sm mb-1">{feature} Locked</h4>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mb-4 tracking-widest leading-relaxed">
                Upgrade to {requiredPlan} Plan<br />to unlock this feature
            </p>
            <Button
                size="sm"
                className="rounded-xl font-bold uppercase tracking-widest h-9 px-4 text-[10px]"
                onClick={() => router.push(`/dashboard/billing`)}
            >
                Upgrade Now
            </Button>
        </div>
    );

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic text-primary">Marketing Hub</h1>
                    <p className="text-muted-foreground text-sm font-medium">Power up your store with advanced growth tools.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Discount Coupons */}
                <Card className="border-2 shadow-sm rounded-3xl overflow-hidden group hover:border-primary transition-all relative">
                    {!hasCouponsAccess && <FeatureLock feature="Coupons" requiredPlan={getRequiredPlan('coupons')} />}
                    <CardHeader className="bg-muted/30 border-b p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                                <Ticket className="w-6 h-6" />
                            </div>
                            {hasCouponsAccess && (
                                <Badge variant="outline" className="rounded-full font-black text-[10px] uppercase border-orange-200 text-orange-600 px-3">
                                    {couponList.length} Active
                                </Badge>
                            )}
                        </div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">Discount Coupons</CardTitle>
                        <CardDescription className="font-medium">Boost sales with targeted discount codes.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        {loadingCoupons ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : couponList.length > 0 ? (
                            <div className="space-y-2">
                                {couponList.slice(0, 2).map(c => (
                                    <div key={c._id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border">
                                        <div className="font-black text-sm uppercase">{c.code}</div>
                                        <div className="text-xs font-bold text-muted-foreground">
                                            {c.type === 'percentage' ? `${c.value}% OFF` : `EGP ${c.value} OFF`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center space-y-2">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No coupons created yet</p>
                            </div>
                        )}
                        <Button
                            className="w-full rounded-2xl h-12 font-black uppercase tracking-widest text-[10px]"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/stores/${storeId}/marketing/coupons`)}
                        >
                            Manage Coupons
                        </Button>
                    </CardContent>
                </Card>

                {/* Tracking Pixels */}
                <Card className="border-2 shadow-sm rounded-3xl overflow-hidden group hover:border-primary transition-all relative">
                    {!hasPixelsAccess && <FeatureLock feature="Pixels" requiredPlan={getRequiredPlan('pixels')} />}
                    <CardHeader className="bg-muted/30 border-b p-6">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                            <Target className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">Tracking Pixels</CardTitle>
                        <CardDescription className="font-medium">Track conversions & optimize your ads.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <Button
                            className="w-full rounded-2xl h-12 font-black uppercase tracking-widest text-[10px]"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/stores/${storeId}/marketing/pixels`)}
                        >
                            Configure Pixels
                        </Button>
                    </CardContent>
                </Card>

                {/* SEO Management */}
                <Card className="border-2 shadow-sm rounded-3xl overflow-hidden group hover:border-primary transition-all relative">
                    {!hasSEOAccess && <FeatureLock feature="SEO" requiredPlan={getRequiredPlan('seo')} />}
                    <CardHeader className="bg-muted/30 border-b p-6">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                            <Globe className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">SEO Center</CardTitle>
                        <CardDescription className="font-medium">Optimize your store for search engines.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <Button
                            className="w-full rounded-2xl h-12 font-black uppercase tracking-widest text-[10px]"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/stores/${storeId}/seo`)}
                        >
                            Edit SEO Settings
                        </Button>
                    </CardContent>
                </Card>

                {/* Abandoned Cart Recovery */}
                <Card className="border-2 shadow-sm rounded-3xl overflow-hidden group hover:border-primary transition-all relative">
                    {!hasAbandonedCartAccess && <FeatureLock feature="Cart Recovery" requiredPlan={getRequiredPlan('abandoned_cart')} />}
                    <CardHeader className="bg-muted/30 border-b p-6">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                            <Plus className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">Cart Recovery</CardTitle>
                        <CardDescription className="font-medium">Recover sales from abandoned carts.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <Button className="w-full rounded-2xl h-12 font-black uppercase tracking-widest text-[10px]" variant="outline">
                            View Lost Carts
                        </Button>
                    </CardContent>
                </Card>

                {/* Social Sharing */}
                <Card className="border-2 shadow-sm rounded-3xl overflow-hidden group hover:border-primary transition-all relative">
                    <CardHeader className="bg-muted/30 border-b p-6">
                        <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center mb-4">
                            <Share2 className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">Social Sharing</CardTitle>
                        <CardDescription className="font-medium">Enable viral sharing for your products.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <Button className="w-full rounded-2xl h-12 font-black uppercase tracking-widest text-[10px]" variant="outline">
                            Configure Sharing
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* AI Marketing Assistant */}
            <Card className="border-2 border-dashed shadow-sm rounded-[40px] overflow-hidden bg-primary/[0.02] relative group hover:border-primary/40 transition-all">
                {!hasAIMarketingAccess && <FeatureLock feature="AI Assistant" requiredPlan={getRequiredPlan('ai_marketing')} />}
                <CardContent className="p-12 text-center space-y-6">
                    <div className="w-24 h-24 rounded-[32px] bg-primary/10 flex items-center justify-center mx-auto text-primary group-hover:scale-110 transition-transform duration-500">
                        <Sparkles className="w-12 h-12 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black uppercase tracking-tighter italic">AI Marketing Magic</h2>
                        <p className="text-muted-foreground max-w-md mx-auto font-medium">
                            Generate high-converting ad copy, landing page headlines and product descriptions automatically using industry-leading AI models.
                        </p>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                        <Badge className="bg-primary text-white border-primary py-1 px-6 font-black uppercase tracking-widest text-[10px]">
                            Enterprise Exclusive
                        </Badge>
                    </div>
                    <Button className="rounded-2xl px-12 h-14 shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs group-hover:scale-105 transition-transform">
                        Launch AI Assistant
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
