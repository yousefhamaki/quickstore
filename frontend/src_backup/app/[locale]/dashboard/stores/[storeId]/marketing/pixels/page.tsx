'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Target,
    Facebook,
    Chrome,
    ArrowLeft,
    Loader2,
    Save,
    CheckCircle2,
    Lock
} from "lucide-react";
import { toast } from "sonner";
import { getMarketingSettings, updatePixels } from '@/services/marketingService';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

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
            onClick={() => window.location.href = '/dashboard/billing'}
        >
            Upgrade Now
        </Button>
    </div>
);

export default function PixelsPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const router = useRouter();
    const t = useTranslations("merchant.marketing.pixels");

    // Feature access
    const { hasAccess: hasPixelsAccess, getRequiredPlan } = useFeatureAccess('pixels', storeId);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        facebookPixelId: '',
        googleAnalyticsId: '',
        tiktokPixelId: '',
        snapchatPixelId: ''
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await getMarketingSettings(storeId);
                if (data.success && data.marketing) {
                    setFormData({
                        facebookPixelId: data.marketing.facebookPixelId || '',
                        googleAnalyticsId: data.marketing.googleAnalyticsId || '',
                        tiktokPixelId: data.marketing.tiktokPixelId || '',
                        snapchatPixelId: data.marketing.snapchatPixelId || ''
                    });
                }
            } catch (error) {
                console.error('Error fetching marketing settings:', error);
                toast.error(t('loadError') || "Failed to load settings");
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [storeId, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updatePixels({
                storeId,
                ...formData
            });
            toast.success(t('success'));
        } catch (error) {
            console.error('Error updating pixels:', error);
            toast.error(t('error'));
        } finally {
            setSaving(false);
        }
    };

    if (!hasPixelsAccess) {
        return (
            <div className="container mx-auto py-10 px-4">
                <FeatureLock
                    feature="Tracking Pixels"
                    requiredPlan={getRequiredPlan('pixels')}
                />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-5xl space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t('back') || 'Back'}
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Target className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tight italic">{t('title')}</h1>
                            <p className="text-muted-foreground font-medium">{t('subtitle')}</p>
                        </div>
                    </div>
                </div>
                <Button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                >
                    {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    {saving ? t('saving') : t('save')}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Facebook Pixel */}
                <Card className="border-2 rounded-3xl overflow-hidden shadow-sm hover:border-blue-200 transition-all">
                    <CardHeader className="bg-blue-50/50 border-b p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                                <Facebook className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black uppercase italic tracking-tighter">Facebook Pixel</CardTitle>
                                <CardDescription className="text-blue-700/70 font-bold text-[10px] uppercase">Meta Marketing</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('facebook')}</Label>
                            <Input
                                placeholder={t('facebookPlaceholder')}
                                value={formData.facebookPixelId}
                                onChange={(e) => setFormData({ ...formData, facebookPixelId: e.target.value })}
                                className="rounded-xl h-12 border-2 focus-visible:ring-blue-500 bg-muted/30"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground font-medium bg-muted/50 p-3 rounded-xl">
                            {t('facebookDesc')}
                        </p>
                    </CardContent>
                </Card>

                {/* Google Analytics */}
                <Card className="border-2 rounded-3xl overflow-hidden shadow-sm hover:border-orange-200 transition-all">
                    <CardHeader className="bg-orange-50/50 border-b p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center">
                                <Chrome className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black uppercase italic tracking-tighter">Google Analytics</CardTitle>
                                <CardDescription className="text-orange-700/70 font-bold text-[10px] uppercase">GA4 Tracking</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('google')}</Label>
                            <Input
                                placeholder={t('googlePlaceholder')}
                                value={formData.googleAnalyticsId}
                                onChange={(e) => setFormData({ ...formData, googleAnalyticsId: e.target.value })}
                                className="rounded-xl h-12 border-2 focus-visible:ring-orange-500 bg-muted/30"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground font-medium bg-muted/50 p-3 rounded-xl">
                            {t('googleDesc')}
                        </p>
                    </CardContent>
                </Card>

                {/* TikTok Pixel */}
                <Card className="border-2 rounded-3xl overflow-hidden shadow-sm hover:border-black transition-all">
                    <CardHeader className="bg-muted/30 border-b p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center">
                                <span className="font-black text-lg">J</span>
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black uppercase italic tracking-tighter">TikTok Pixel</CardTitle>
                                <CardDescription className="font-bold text-[10px] uppercase">Bytedance Ads</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('tiktok')}</Label>
                            <Input
                                placeholder={t('tiktokPlaceholder')}
                                value={formData.tiktokPixelId}
                                onChange={(e) => setFormData({ ...formData, tiktokPixelId: e.target.value })}
                                className="rounded-xl h-12 border-2 focus-visible:ring-black bg-muted/30"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground font-medium bg-muted/50 p-3 rounded-xl">
                            {t('tiktokDesc')}
                        </p>
                    </CardContent>
                </Card>

                {/* Snapchat Pixel */}
                <Card className="border-2 rounded-3xl overflow-hidden shadow-sm hover:border-yellow-400 transition-all">
                    <CardHeader className="bg-yellow-50/50 border-b p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-yellow-400 text-black flex items-center justify-center">
                                <span className="font-black text-lg">S</span>
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black uppercase italic tracking-tighter">Snapchat Pixel</CardTitle>
                                <CardDescription className="text-yellow-700/70 font-bold text-[10px] uppercase">Snap Ads</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('snapchat')}</Label>
                            <Input
                                placeholder={t('snapPlaceholder')}
                                value={formData.snapchatPixelId}
                                onChange={(e) => setFormData({ ...formData, snapchatPixelId: e.target.value })}
                                className="rounded-xl h-12 border-2 focus-visible:ring-yellow-400 bg-muted/30"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground font-medium bg-muted/50 p-3 rounded-xl">
                            {t('snapchatDesc')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Help Info */}
            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/10 flex flex-col md:flex-row items-center gap-8 shadow-inner">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center text-primary flex-shrink-0">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2 text-center md:text-left">
                    <h3 className="text-xl font-black uppercase italic tracking-tight italic">Why use tracking pixels?</h3>
                    <p className="text-muted-foreground text-sm font-medium leading-relaxed max-w-2xl">
                        Pixels allow you to track what customers do after clicking your ads.
                        By adding these IDs, QuickStore automatically sends events like **Page View**, **Add to Cart**, and **Purchase**
                        to your advertising platforms, helping you lower your cost per sale.
                    </p>
                </div>
            </div>
        </div>
    );
}
