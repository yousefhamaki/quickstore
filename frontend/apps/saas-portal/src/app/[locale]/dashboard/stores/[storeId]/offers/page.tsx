'use client';

import { use } from "react";
import { useStore } from "@shared/lib/hooks/useStore";
import { useBillingOverview } from "@shared/lib/hooks/useBilling";
import { useEffect, useState } from "react";
import { getCampaigns, updateCampaign } from "@shared/lib/api/offers";
import Link from "next/link";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Plus, ArrowUpRight, TrendingUp, Zap, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { getStorefrontOfferUrl } from "@shared/lib/utils/url";
import { toast } from "sonner";

export default function OffersCampaignsPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading: isStoreLoading } = useStore(storeId);
    const { data: billing, isLoading: isBillingLoading } = useBillingOverview();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Hardcode some translations to avoid adding to i18n files right now
    const t = {
        title: 'Conversion Offers',
        subtitle: 'Boost your Average Order Value with Upsells, Cross-sells, and Down-sells',
        create: 'Create Campaign',
        proGateTitle: 'Unlock Advanced Conversions',
        proGateDesc: 'Upsells, Cross-sells, and Exit-Intent Down-sells are available on the Professional Plus plan.',
        upgradeBtn: 'Upgrade to Pro',
    };

    const loadCampaigns = () => {
        setIsLoading(true);
        getCampaigns(storeId)
            .then((data: any) => setCampaigns(data.campaigns || []))
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        if (!storeId) return;
        loadCampaigns();
    }, [storeId]);

    const toggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'active' ? 'paused' : 'active';
            await updateCampaign(campaignId, { status: newStatus });
            // Optimistically update
            setCampaigns(prev => prev.map(c => c._id === campaignId ? { ...c, status: newStatus } : c));
        } catch (err) {
            console.error('Failed to update campaign status', err);
        }
    };

    if (isStoreLoading || isLoading || isBillingLoading) {
        return (
            <div className="p-4 md:p-8 space-y-8">
                <Skeleton className="w-48 h-10" />
                <div className="space-y-4">
                    <Skeleton className="w-full h-20" />
                    <Skeleton className="w-full h-20" />
                </div>
            </div>
        );
    }

    const planName = billing?.plan?.name || billing?.plan?.name_en || '';
    const isProTier = planName.toLowerCase().includes('pro') || planName.toLowerCase().includes('enterprise');
    const allowUCD = (billing?.plan?.features as any)?.allowUCD ?? isProTier;

    console.log(billing)
    if (!allowUCD) {
        return (
            <div className="p-4 md:p-8 animate-in fade-in duration-500 relative min-h-[60vh] flex flex-col items-center justify-center">
                {/* Background blurred mockup of campaigns */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 blur-sm flex flex-col gap-4 p-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-full h-24 bg-white border rounded-2xl" />
                    ))}
                </div>

                {/* Gate Hero */}
                <div className="relative z-10 max-w-xl mx-auto text-center space-y-6 bg-white/80 backdrop-blur-xl p-12 rounded-[40px] border shadow-2xl">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[24px] mx-auto flex items-center justify-center shadow-lg shadow-purple-500/30 text-white">
                        <Zap size={32} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black tracking-tighter">{t.proGateTitle}</h2>
                        <p className="text-muted-foreground font-medium">{t.proGateDesc}</p>
                    </div>
                    <Button asChild size="lg" className="h-14 px-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-xl shadow-purple-500/25">
                        <Link href="/merchant/plans">
                            {t.upgradeBtn} <ArrowUpRight className="ml-2 w-5 h-5" />
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tighter">{t.title}</h1>
                    <p className="text-muted-foreground font-medium">{t.subtitle}</p>
                </div>
                <Button asChild size="lg" className="h-12 rounded-full px-6 shadow-xl shadow-primary/20">
                    <Link href={`/dashboard/stores/${storeId}/offers/new`}>
                        <Plus className="mr-2 w-5 h-5" /> {t.create}
                    </Link>
                </Button>
            </div>

            {campaigns.length === 0 ? (
                <div className="bg-muted/30 border-2 border-dashed rounded-[32px] p-16 text-center space-y-6">
                    <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center shadow-sm text-gray-400">
                        <Target size={32} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold">No campaigns yet</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            Create your first Upsell or Cross-sell to start maximizing revenue per visitor.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="p-6 font-bold text-xs uppercase tracking-widest text-muted-foreground">Campaign Name</th>
                                    <th className="p-6 font-bold text-xs uppercase tracking-widest text-muted-foreground">Type</th>
                                    <th className="p-6 font-bold text-xs uppercase tracking-widest text-muted-foreground">Status</th>
                                    <th className="p-6 font-bold text-xs uppercase tracking-widest text-muted-foreground">Views</th>
                                    <th className="p-6 font-bold text-xs uppercase tracking-widest text-muted-foreground">Accepts</th>
                                    <th className="p-6 font-bold text-xs uppercase tracking-widest text-muted-foreground">Revenue</th>
                                    <th className="p-6 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {campaigns.map((camp) => (
                                    <tr key={camp._id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="p-6">
                                            <div className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                                                {camp.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1 uppercase font-semibold tracking-wider">
                                                {camp.trigger.event}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${camp.type === 'upsell' ? 'bg-blue-100 text-blue-700' :
                                                camp.type === 'cross_sell' ? 'bg-purple-100 text-purple-700' :
                                                camp.type === 'down_sell' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                {camp.type.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${camp.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                <span className="text-sm font-semibold capitalize">{camp.status}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 font-mono text-sm">
                                            {camp.analytics?.impressions || 0}
                                        </td>
                                        <td className="p-6 font-mono text-sm">
                                            {camp.totalAcceptances || 0}
                                        </td>
                                        <td className="p-6 font-mono font-bold text-green-600 flex items-center gap-1">
                                            <TrendingUp size={14} /> EGP {camp.analytics?.revenue?.toLocaleString() || 0}
                                        </td>
                                        <td className="p-6 text-right flex items-center justify-end gap-2">
                                            {camp.type === 'offer_page' && store?.domain?.subdomain && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        const url = getStorefrontOfferUrl(store.domain.subdomain, camp._id);
                                                        navigator.clipboard.writeText(url);
                                                        toast.success('Offer Page URL copied to clipboard!');
                                                    }}
                                                    className="text-xs font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                >
                                                    Copy Link
                                                </Button>
                                            )}
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => toggleCampaignStatus(camp._id, camp.status)}
                                                className="text-xs font-bold uppercase tracking-widest"
                                            >
                                                {camp.status === 'active' ? 'Pause' : 'Activate'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
