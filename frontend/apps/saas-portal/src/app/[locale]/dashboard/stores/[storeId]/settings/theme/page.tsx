'use client';

import { use } from "react";
import { useStore, useUpdateStore } from "@shared/lib/hooks/useStore";
import { useForm } from "react-hook-form";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter
} from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Label } from "@shared/components/ui/label";
import { Input } from "@shared/components/ui/input";
import { Switch } from "@shared/components/ui/switch";
import {
    Palette,
    Save,
    Loader2,
    Eye,
    Layout,
    Sparkles,
    Square,
    RectangleHorizontal,
    Circle,
    Grid2x2,
    Grid3x3,
    Megaphone,
    ImageIcon,
    PanelBottom,
    Star
} from "lucide-react";
import { cn } from "@shared/lib/utils";
import { HeroSliderEditor } from "@shared/components/merchant/HeroSliderEditor";

const PRESET_COLORS = [
    { name: "Blue", primary: "#3B82F6", secondary: "#1E40AF" },
    { name: "Indigo", primary: "#6366F1", secondary: "#3730A3" },
    { name: "Rose", primary: "#F43F5E", secondary: "#9F1239" },
    { name: "Amber", primary: "#F59E0B", secondary: "#92400E" },
    { name: "Emerald", primary: "#10B981", secondary: "#065F46" },
    { name: "Slate", primary: "#64748B", secondary: "#1E293B" },
];

const FONTS = ["Inter", "Roboto", "Outfit", "Space Grotesk", "Plus Jakarta Sans", "Poppins", "Playfair Display"];

const BUTTON_RADIUS_OPTIONS = [
    { value: 'sharp', label: 'Sharp', icon: Square, radius: '4px' },
    { value: 'soft', label: 'Soft', icon: RectangleHorizontal, radius: '12px' },
    { value: 'pill', label: 'Pill', icon: Circle, radius: '9999px' },
] as const;

const GRID_OPTIONS = [
    { value: 2, label: '2 Columns', icon: Grid2x2 },
    { value: 3, label: '3 Columns', icon: Grid3x3 },
    { value: 4, label: '4 Columns', icon: Grid3x3 },
] as const;

/**
 * One-click bundles across everything below — a merchant who doesn't want
 * to tune every knob individually can just pick a look.
 */
const PRESETS = [
    {
        name: 'Modern', primary: '#3B82F6', secondary: '#1E40AF', font: 'Inter',
        buttonRadius: 'pill' as const, columns: 4 as const,
    },
    {
        name: 'Minimalist', primary: '#18181B', secondary: '#3F3F46', font: 'Outfit',
        buttonRadius: 'sharp' as const, columns: 3 as const,
    },
    {
        name: 'Bold', primary: '#F43F5E', secondary: '#9F1239', font: 'Space Grotesk',
        buttonRadius: 'pill' as const, columns: 4 as const,
    },
    {
        name: 'Elegant', primary: '#78716C', secondary: '#292524', font: 'Playfair Display',
        buttonRadius: 'soft' as const, columns: 3 as const,
    },
];

export default function ThemeSettings({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading } = useStore(storeId);
    const updateMutation = useUpdateStore(storeId);

    const { register, handleSubmit, watch, setValue, formState: { isDirty } } = useForm({
        values: store ? {
            branding: {
                primaryColor: store.branding?.primaryColor || "#3B82F6",
                secondaryColor: store.branding?.secondaryColor || "#1E40AF",
                fontFamily: store.branding?.fontFamily || "Inter",
            },
            theme: {
                name: store.theme?.name || 'modern',
                customizations: {
                    buttonRadius: store.theme?.customizations?.buttonRadius || 'pill',
                    productGrid: {
                        columns: store.theme?.customizations?.productGrid?.columns || 4,
                        showRatings: store.theme?.customizations?.productGrid?.showRatings !== false,
                    },
                    announcementBar: {
                        enabled: store.theme?.customizations?.announcementBar?.enabled || false,
                        text: store.theme?.customizations?.announcementBar?.text || '',
                        backgroundColor: store.theme?.customizations?.announcementBar?.backgroundColor || '',
                        textColor: store.theme?.customizations?.announcementBar?.textColor || '#FFFFFF',
                    },
                    hero: {
                        headline: store.theme?.customizations?.hero?.headline || '',
                        subheadline: store.theme?.customizations?.hero?.subheadline || '',
                        ctaText: store.theme?.customizations?.hero?.ctaText || '',
                    },
                    footer: {
                        copyrightText: store.theme?.customizations?.footer?.copyrightText || '',
                    },
                }
            }
        } : undefined
    });

    const currentPrimary = watch("branding.primaryColor");
    const currentFont = watch("branding.fontFamily");
    const buttonRadius = watch("theme.customizations.buttonRadius");
    const gridColumns = watch("theme.customizations.productGrid.columns");
    const showRatings = watch("theme.customizations.productGrid.showRatings");
    const announcementEnabled = watch("theme.customizations.announcementBar.enabled");
    const announcementText = watch("theme.customizations.announcementBar.text");
    const announcementBg = watch("theme.customizations.announcementBar.backgroundColor");
    const announcementFg = watch("theme.customizations.announcementBar.textColor");

    const applyPreset = (preset: typeof PRESETS[number]) => {
        setValue("branding.primaryColor", preset.primary, { shouldDirty: true });
        setValue("branding.secondaryColor", preset.secondary, { shouldDirty: true });
        setValue("branding.fontFamily", preset.font, { shouldDirty: true });
        setValue("theme.name", preset.name.toLowerCase(), { shouldDirty: true });
        setValue("theme.customizations.buttonRadius", preset.buttonRadius, { shouldDirty: true });
        setValue("theme.customizations.productGrid.columns", preset.columns, { shouldDirty: true });
    };

    const onSubmit = handleSubmit(async (data) => {
        // heroSlider isn't a field this form manages (HeroSliderEditor saves
        // it independently) — but the backend replaces theme.customizations
        // wholesale on save, so it has to be re-merged in here or saving any
        // OTHER theme setting from this form would silently wipe out the
        // merchant's slides.
        await updateMutation.mutateAsync({
            branding: data.branding,
            theme: {
                ...data.theme,
                customizations: {
                    ...data.theme.customizations,
                    heroSlider: store?.theme?.customizations?.heroSlider,
                },
            },
        });
    });

    const radiusPxMap: Record<string, string> = { sharp: '4px', soft: '12px', pill: '9999px' };

    if (isLoading) return <div className="p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Storefront Theme</h1>
                    <p className="text-muted-foreground">Customize your store's colors, fonts, layout, and messaging.</p>
                </div>
                <Button variant="outline" className="rounded-xl" asChild>
                    <a href={`/preview/${storeId}`} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-4 h-4 mr-2" /> Live Preview
                    </a>
                </Button>
            </div>

            <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">

                    {/* Presets */}
                    <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" /> Quick Start Presets
                            </CardTitle>
                            <CardDescription>One click sets colors, font, buttons, and layout together.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {PRESETS.map((preset) => (
                                    <button
                                        key={preset.name}
                                        type="button"
                                        onClick={() => applyPreset(preset)}
                                        className="p-4 rounded-xl border-2 border-transparent bg-muted/30 hover:border-primary/40 hover:bg-primary/5 transition text-left space-y-3"
                                    >
                                        <div className="flex -space-x-1">
                                            <div className="w-7 h-7 rounded-full border-2 border-background" style={{ backgroundColor: preset.primary }} />
                                            <div className="w-7 h-7 rounded-full border-2 border-background" style={{ backgroundColor: preset.secondary }} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{preset.name}</p>
                                            <p className="text-[10px] text-muted-foreground" style={{ fontFamily: preset.font }}>{preset.font}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Brand Colors */}
                    <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Palette className="w-5 h-5 text-primary" />
                                Brand Colors
                            </CardTitle>
                            <CardDescription>Select your brand's primary and secondary colors.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-8">
                            <div className="space-y-4">
                                <Label>Preset Palettes</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {PRESET_COLORS.map((color) => (
                                        <button
                                            key={color.name}
                                            type="button"
                                            onClick={() => {
                                                setValue("branding.primaryColor", color.primary, { shouldDirty: true });
                                                setValue("branding.secondaryColor", color.secondary, { shouldDirty: true });
                                            }}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl border-2 transition text-sm font-medium",
                                                currentPrimary === color.primary ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:bg-muted"
                                            )}
                                        >
                                            <div className="flex -space-x-1">
                                                <div className="w-6 h-6 rounded-full border-2 border-background" style={{ backgroundColor: color.primary }} />
                                                <div className="w-6 h-6 rounded-full border-2 border-background" style={{ backgroundColor: color.secondary }} />
                                            </div>
                                            {color.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                <div className="space-y-3">
                                    <Label>Custom Primary Color</Label>
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl border-2 border-muted overflow-hidden shrink-0">
                                            <input
                                                type="color"
                                                {...register("branding.primaryColor")}
                                                className="w-full h-full scale-150 cursor-pointer"
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            {...register("branding.primaryColor")}
                                            className="flex-1 bg-muted/50 border-none rounded-xl px-4 font-mono text-sm uppercase"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label>Custom Secondary Color</Label>
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl border-2 border-muted overflow-hidden shrink-0">
                                            <input
                                                type="color"
                                                {...register("branding.secondaryColor")}
                                                className="w-full h-full scale-150 cursor-pointer"
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            {...register("branding.secondaryColor")}
                                            className="flex-1 bg-muted/50 border-none rounded-xl px-4 font-mono text-sm uppercase"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Typography */}
                    <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Layout className="w-5 h-5 text-primary" />
                                Typography
                            </CardTitle>
                            <CardDescription>Choose the font family for your store.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {FONTS.map((font) => (
                                    <button
                                        key={font}
                                        type="button"
                                        onClick={() => setValue("branding.fontFamily", font, { shouldDirty: true })}
                                        className={cn(
                                            "p-4 rounded-xl border-2 transition text-left group",
                                            currentFont === font ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:bg-muted"
                                        )}
                                        style={{ fontFamily: font }}
                                    >
                                        <p className="text-lg font-bold group-hover:text-primary transition-colors">{font}</p>
                                        <p className="text-xs text-muted-foreground">The quick brown fox jumps over the lazy dog</p>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Button Style */}
                    <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Square className="w-5 h-5 text-primary" /> Button Style
                            </CardTitle>
                            <CardDescription>Corner style for "Add to Cart" and other buttons storewide.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-3 gap-4">
                                {BUTTON_RADIUS_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setValue("theme.customizations.buttonRadius", opt.value, { shouldDirty: true })}
                                        className={cn(
                                            "p-4 rounded-xl border-2 transition flex flex-col items-center gap-3",
                                            buttonRadius === opt.value ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:bg-muted"
                                        )}
                                    >
                                        <div
                                            className="w-full h-9 flex items-center justify-center text-white text-[10px] font-black"
                                            style={{ backgroundColor: currentPrimary, borderRadius: opt.radius }}
                                        >
                                            BUTTON
                                        </div>
                                        <p className="text-xs font-bold">{opt.label}</p>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Product Grid */}
                    <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Grid3x3 className="w-5 h-5 text-primary" /> Product Grid
                            </CardTitle>
                            <CardDescription>How products are laid out on your homepage.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                                {GRID_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setValue("theme.customizations.productGrid.columns", opt.value, { shouldDirty: true })}
                                        className={cn(
                                            "p-4 rounded-xl border-2 transition flex flex-col items-center gap-3",
                                            gridColumns === opt.value ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:bg-muted"
                                        )}
                                    >
                                        <div className="w-full grid gap-1" style={{ gridTemplateColumns: `repeat(${opt.value}, 1fr)` }}>
                                            {Array.from({ length: opt.value }).map((_, i) => (
                                                <div key={i} className="aspect-square rounded bg-muted-foreground/30" />
                                            ))}
                                        </div>
                                        <p className="text-xs font-bold">{opt.label}</p>
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <Star className="w-4 h-4 text-amber-500" />
                                    <div>
                                        <p className="text-sm font-bold">Show star ratings on product cards</p>
                                        <p className="text-xs text-muted-foreground">Requires approved customer reviews to appear.</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={!!showRatings}
                                    onCheckedChange={(checked) => setValue("theme.customizations.productGrid.showRatings", checked, { shouldDirty: true })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Announcement Bar */}
                    <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Megaphone className="w-5 h-5 text-primary" /> Announcement Bar
                            </CardTitle>
                            <CardDescription>A thin banner above your header — great for promos or shipping info.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-5">
                            <div className="flex items-center justify-between">
                                <Label>Enable announcement bar</Label>
                                <Switch
                                    checked={!!announcementEnabled}
                                    onCheckedChange={(checked) => setValue("theme.customizations.announcementBar.enabled", checked, { shouldDirty: true })}
                                />
                            </div>
                            {announcementEnabled && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <Label>Message</Label>
                                        <Input
                                            {...register("theme.customizations.announcementBar.text")}
                                            placeholder="Free shipping on orders over 500 EGP!"
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Background Color</Label>
                                            <div className="flex gap-2">
                                                <input type="color" {...register("theme.customizations.announcementBar.backgroundColor")} className="w-10 h-10 rounded-lg border-2 cursor-pointer" />
                                                <input type="text" {...register("theme.customizations.announcementBar.backgroundColor")} placeholder="Uses primary color" className="flex-1 bg-muted/50 border-none rounded-xl px-3 font-mono text-xs" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Text Color</Label>
                                            <div className="flex gap-2">
                                                <input type="color" {...register("theme.customizations.announcementBar.textColor")} className="w-10 h-10 rounded-lg border-2 cursor-pointer" />
                                                <input type="text" {...register("theme.customizations.announcementBar.textColor")} className="flex-1 bg-muted/50 border-none rounded-xl px-3 font-mono text-xs" />
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        className="w-full text-center py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest"
                                        style={{ backgroundColor: announcementBg || currentPrimary, color: announcementFg || '#fff' }}
                                    >
                                        {announcementText || 'Your announcement text'}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Hero Section */}
                    <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ImageIcon className="w-5 h-5 text-primary" /> Homepage Hero
                            </CardTitle>
                            <CardDescription>Leave blank to use your store name and description automatically.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-2">
                                <Label>Headline</Label>
                                <Input {...register("theme.customizations.hero.headline")} placeholder={`Welcome to ${store?.name || 'your store'}`} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label>Subheadline</Label>
                                <Input {...register("theme.customizations.hero.subheadline")} placeholder={store?.description || "A short, compelling tagline"} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label>Call-to-action button text</Label>
                                <Input {...register("theme.customizations.hero.ctaText")} placeholder="Start Shopping" className="rounded-xl" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Hero Slider — saves independently of the form above (its own
                        button, own mutation call) since it manages an array of
                        slides with per-slide async image uploads rather than a
                        flat set of react-hook-form fields. */}
                    <HeroSliderEditor storeId={storeId} />

                    {/* Footer */}
                    <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <PanelBottom className="w-5 h-5 text-primary" /> Footer
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-2">
                                <Label>Copyright text</Label>
                                <Input
                                    {...register("theme.customizations.footer.copyrightText")}
                                    placeholder={`© ${new Date().getFullYear()} ${store?.name || 'Your Store'}. All rights reserved.`}
                                    className="rounded-xl"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview Sidebar */}
                <div className="space-y-8">
                    <Card className="border-2 shadow-sm rounded-2xl overflow-hidden sticky top-8">
                        <CardHeader className="bg-muted/30 border-b">
                            <CardTitle className="text-sm uppercase tracking-widest font-black text-muted-foreground">Store Preview</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div
                                className="rounded-2xl shadow-2xl overflow-hidden border"
                                style={{ fontFamily: currentFont }}
                            >
                                {announcementEnabled && announcementText && (
                                    <div
                                        className="w-full text-center py-1.5 text-[8px] font-bold uppercase tracking-widest"
                                        style={{ backgroundColor: announcementBg || currentPrimary, color: announcementFg || '#fff' }}
                                    >
                                        {announcementText}
                                    </div>
                                )}
                                <div className="p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="w-12 h-4 rounded bg-muted" />
                                        <div className="flex gap-2">
                                            <div className="w-4 h-4 rounded-full bg-muted" />
                                            <div className="w-4 h-4 rounded-full bg-muted" />
                                        </div>
                                    </div>
                                    <div className="w-full aspect-square rounded-xl bg-muted animate-pulse" />
                                    <div className="space-y-2">
                                        <div className="w-2/3 h-5 rounded bg-muted" />
                                        <div className="w-1/3 h-4 rounded bg-muted" />
                                        {showRatings && (
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={10} className="fill-amber-400 text-amber-400" />)}
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        className="w-full h-10 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-primary/20"
                                        style={{ backgroundColor: currentPrimary, borderRadius: radiusPxMap[buttonRadius] || '9999px' }}
                                    >
                                        ADD TO CART
                                    </div>
                                    <div className="grid gap-1.5 pt-2" style={{ gridTemplateColumns: `repeat(${gridColumns || 4}, 1fr)` }}>
                                        {Array.from({ length: gridColumns || 4 }).map((_, i) => (
                                            <div key={i} className="aspect-[4/5] rounded-md bg-muted" />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-widest">Live Concept Preview</p>
                        </CardContent>
                        <CardFooter className="bg-muted/30 border-t p-4">
                            <Button
                                type="submit"
                                disabled={!isDirty || updateMutation.isPending}
                                className="w-full rounded-xl"
                            >
                                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Theme</>}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </form>
        </div>
    );
}
