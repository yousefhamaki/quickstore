'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Switch } from "@shared/components/ui/switch";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import {
    ArrowLeft,
    Loader2,
    Save,
    Share2,
    Lock,
    Link2,
    CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { getMarketingSettings, updateSocialSharing } from '@shared/services/marketingService';
import { useFeatureAccess } from '@shared/hooks/useFeatureAccess';
import { PLAN_MAPPING, PLAN_NAMES } from '@shared/config/planFeatures';

// Platform Config Icons & Details
const PLATFORM_DETAILS = {
    whatsapp: {
        name: 'WhatsApp',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        icon: (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.388 2.016 13.922 1 11.997 1 6.561 1 2.137 5.37 2.133 10.8c-.001 1.696.448 3.354 1.3 4.8l-.995 3.637 3.737-.968zm11.387-4.6c-.307-.154-1.817-.897-2.097-1-.28-.103-.483-.154-.686.154-.203.308-.787 1-1.017 1.256-.23.256-.46.287-.768.133-1.285-.64-2.141-1.09-2.987-2.56-.223-.388.223-.36.64-1.195.06-.13.03-.244-.015-.34-.045-.097-.483-1.16-.662-1.59-.174-.42-.365-.363-.483-.369-.124-.007-.267-.008-.41-.008-.143 0-.377.054-.573.27-.197.215-.752.736-.752 1.795s.77 2.083.877 2.227c.108.144 1.517 2.316 3.675 3.248 1.8.78 2.167.624 2.553.587.387-.037 1.817-.743 2.073-1.46.257-.717.257-1.33.18-1.46-.077-.13-.282-.208-.589-.363z" />
            </svg>
        )
    },
    facebook: {
        name: 'Facebook',
        color: 'text-blue-600',
        bgColor: 'bg-blue-600/10',
        icon: (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
        )
    },
    twitter: {
        name: 'X (Twitter)',
        color: 'text-black',
        bgColor: 'bg-black/10',
        icon: (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
        )
    },
    pinterest: {
        name: 'Pinterest',
        color: 'text-red-600',
        bgColor: 'bg-red-600/10',
        icon: (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.966 1.406-5.966s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.162 0 7.397 2.967 7.397 6.93 0 4.136-2.607 7.464-6.227 7.464-1.215 0-2.359-.631-2.75-1.378l-.748 2.853c-.27 1.042-1.002 2.35-1.498 3.146 1.124.347 2.317.535 3.554.535 6.621 0 11.988-5.367 11.988-11.988C24.005 5.368 18.638 0 12.017 0z" />
            </svg>
        )
    },
    copyLink: {
        name: 'Copy Link',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-600/10',
        icon: <Link2 className="w-5 h-5" />
    }
};

export default function SocialSharingPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const router = useRouter();

    const { planName, isLoading: accessLoading } = useFeatureAccess(undefined, storeId);
    const normalizedPlan = PLAN_MAPPING[planName] || PLAN_NAMES.STARTER;
    const isStarter = normalizedPlan === PLAN_NAMES.STARTER;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [enabled, setEnabled] = useState(true);
    const [platforms, setPlatforms] = useState<string[]>([]);
    const [defaultMessage, setDefaultMessage] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await getMarketingSettings(storeId);
                if (data.success && data.marketing) {
                    const sharing = data.marketing.socialSharing;
                    setEnabled(sharing ? sharing.enabled : true);
                    setPlatforms(sharing?.platforms || ['facebook', 'twitter', 'whatsapp', 'pinterest', 'copyLink']);
                    setDefaultMessage(sharing?.defaultMessage || 'Check out this amazing product!');
                }
            } catch (error) {
                console.error('Error fetching social settings:', error);
                toast.error("Failed to load settings");
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [storeId]);

    const handleTogglePlatform = (platformId: string) => {
        // Starter Plan restrictions: lock Facebook, Twitter, and Pinterest
        if (isStarter && ['facebook', 'twitter', 'pinterest'].includes(platformId)) {
            toast.error("Facebook, X/Twitter, and Pinterest sharing are locked under the Starter Plan. Please upgrade!");
            return;
        }

        setPlatforms(prev => {
            if (prev.includes(platformId)) {
                return prev.filter(id => id !== platformId);
            } else {
                return [...prev, platformId];
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Re-enforce Starter plan rules locally on submit
            let finalPlatforms = platforms;
            let finalMessage = defaultMessage;

            if (isStarter) {
                finalPlatforms = platforms.filter(p => ['copyLink', 'whatsapp'].includes(p));
                finalMessage = 'Check out this amazing product!';
            }

            await updateSocialSharing({
                storeId,
                enabled,
                platforms: finalPlatforms,
                defaultMessage: finalMessage
            });
            toast.success("Social Sharing settings updated successfully");
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (accessLoading || loading) {
        return (
            <div className="p-8 space-y-8 animate-pulse">
                <div className="h-12 w-64 bg-muted rounded-2xl" />
                <div className="h-64 bg-muted rounded-[2.5rem]" />
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
                        className="mb-2 -ml-2 text-muted-foreground hover:text-foreground font-black uppercase tracking-widest text-[10px]"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center">
                            <Share2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tight italic">Social Sharing</h1>
                            <p className="text-muted-foreground font-medium">Configure product sharing tools for your storefront</p>
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
                    {saving ? 'Saving' : 'Save Settings'}
                </Button>
            </div>

            {/* Plan Warning Banner */}
            {isStarter && (
                <div className="p-6 rounded-[2rem] bg-amber-50 border-2 border-amber-200/50 flex flex-col sm:flex-row items-center gap-4 text-amber-900 shadow-sm animate-in fade-in duration-300">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                        <Lock className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 text-center sm:text-left flex-1">
                        <h4 className="font-black text-sm uppercase tracking-tight">Starter Plan Limitations Active</h4>
                        <p className="text-xs text-amber-800/80 font-bold uppercase tracking-wider">
                            You are limited to basic sharing (WhatsApp & Copy Link) and cannot customize the default message. Upgrade to Pro/Enterprise plan to unlock all features.
                        </p>
                    </div>
                    <Button
                        size="sm"
                        className="rounded-xl font-bold uppercase tracking-widest text-[10px] bg-amber-600 hover:bg-amber-700 text-white border-0 shadow-sm"
                        onClick={() => router.push('/dashboard/billing')}
                    >
                        Upgrade Now
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Settings Card */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
                        <CardHeader className="bg-muted/30 border-b p-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Enable Social Sharing</CardTitle>
                                    <CardDescription className="font-semibold text-xs text-muted-foreground uppercase">Enable or disable social sharing icons on product pages</CardDescription>
                                </div>
                                <Switch
                                    checked={enabled}
                                    onCheckedChange={setEnabled}
                                />
                            </div>
                        </CardHeader>
                        {enabled && (
                            <CardContent className="p-8 space-y-8">
                                {/* Platforms Toggles */}
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Share Platforms</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {Object.entries(PLATFORM_DETAILS).map(([id, platform]) => {
                                            const isLocked = isStarter && ['facebook', 'twitter', 'pinterest'].includes(id);
                                            const isChecked = platforms.includes(id) && !isLocked;

                                            return (
                                                <div
                                                    key={id}
                                                    onClick={() => handleTogglePlatform(id)}
                                                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                                                        isChecked
                                                            ? 'border-primary bg-primary/[0.02]'
                                                            : 'border-muted hover:border-muted-foreground/30 bg-muted/20'
                                                    } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${platform.bgColor} ${platform.color}`}>
                                                            {platform.icon}
                                                        </div>
                                                        <span className="font-bold text-sm">{platform.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                        {isLocked ? (
                                                            <Lock className="w-4 h-4 text-muted-foreground mr-1" />
                                                        ) : (
                                                            <Switch
                                                                checked={isChecked}
                                                                onCheckedChange={() => handleTogglePlatform(id)}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Default Message Input */}
                                <div className="space-y-2 relative">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Default Share Message</Label>
                                        {isStarter && (
                                            <span className="text-[9px] bg-amber-100 text-amber-700 font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Locked</span>
                                        )}
                                    </div>
                                    <Textarea
                                        placeholder="Check out this amazing product!"
                                        value={isStarter ? 'Check out this amazing product!' : defaultMessage}
                                        disabled={isStarter}
                                        onChange={(e) => setDefaultMessage(e.target.value)}
                                        className="rounded-2xl border-2 bg-muted/10 h-28 focus-visible:ring-primary font-medium"
                                    />
                                    <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed">
                                        This text is pre-filled when visitors share product links. The product name and URL are appended automatically.
                                    </p>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </div>

                {/* Right Side Guide */}
                <div className="space-y-6">
                    <Card className="border-2 rounded-[2.5rem] bg-gradient-to-br from-primary/[0.03] to-primary/[0.08] border-primary/10 overflow-hidden shadow-inner h-full flex flex-col justify-between">
                        <CardHeader className="p-8 pb-4">
                            <div className="w-12 h-12 rounded-2xl bg-white shadow-xl flex items-center justify-center text-primary mb-6">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-xl font-black uppercase italic tracking-tighter mb-2">How it works</CardTitle>
                            <CardDescription className="text-muted-foreground text-xs font-semibold leading-relaxed">
                                Boost viral storefront visits by enabling social sharing tools.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-6 text-sm font-medium leading-relaxed text-muted-foreground">
                            <div className="space-y-2">
                                <h5 className="font-black text-xs text-foreground uppercase tracking-wider">🚀 Viral Growth</h5>
                                <p className="text-xs">
                                    Let store visitors market your items for you! Active buttons on product detail pages let them publish links directly to their feeds.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <h5 className="font-black text-xs text-foreground uppercase tracking-wider">📱 Responsive Mobile Actions</h5>
                                <p className="text-xs">
                                    Mobile visitors see a native share prompt utilizing their operating system's Web Share API, leveraging custom contact lists easily.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <h5 className="font-black text-xs text-foreground uppercase tracking-wider">🔒 Plan Protection</h5>
                                <p className="text-xs">
                                    Upgrade to Professional or Enterprise plans to activate Facebook, X/Twitter, and Pinterest sharing widgets, and customize sharing templates.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
