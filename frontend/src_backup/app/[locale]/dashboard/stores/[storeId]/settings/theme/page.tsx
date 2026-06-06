'use client';

import { use } from "react";
import { useStore, useUpdateStore } from "@/lib/hooks/useStore";
import { useForm } from "react-hook-form";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Palette,
    Save,
    Loader2,
    Eye,
    Layout
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
    { name: "Blue", primary: "#3B82F6", secondary: "#1E40AF" },
    { name: "Indigo", primary: "#6366F1", secondary: "#3730A3" },
    { name: "Rose", primary: "#F43F5E", secondary: "#9F1239" },
    { name: "Amber", primary: "#F59E0B", secondary: "#92400E" },
    { name: "Emerald", primary: "#10B981", secondary: "#065F46" },
    { name: "Slate", primary: "#64748B", secondary: "#1E293B" },
];

const FONTS = ["Inter", "Roboto", "Outfit", "Space Grotesk", "Plus Jakarta Sans"];

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
            }
        } : undefined
    });

    const currentPrimary = watch("branding.primaryColor");
    const currentFont = watch("branding.fontFamily");

    const onSubmit = handleSubmit(async (data) => {
        await updateMutation.mutateAsync({ branding: data.branding });
    });

    if (isLoading) return <div className="p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Store Branding</h1>
                    <p className="text-muted-foreground">Customize your store's colors, fonts and visual identity.</p>
                </div>
                <Button variant="outline" className="rounded-xl" asChild>
                    <a href={`/preview/${storeId}`} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-4 h-4 mr-2" /> Live Preview
                    </a>
                </Button>
            </div>

            <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
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
                                                "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-sm font-medium",
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
                                            "p-4 rounded-xl border-2 transition-all text-left group",
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
                </div>

                {/* Preview Sidebar */}
                <div className="space-y-8">
                    <Card className="border-2 shadow-sm rounded-2xl overflow-hidden sticky top-8">
                        <CardHeader className="bg-muted/30 border-b">
                            <CardTitle className="text-sm uppercase tracking-widest font-black text-muted-foreground">Store Preview</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div
                                className="aspect-[4/5] rounded-2xl shadow-2xl overflow-hidden border p-4 space-y-4"
                                style={{ fontFamily: currentFont }}
                            >
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
                                </div>
                                <div
                                    className="w-full h-10 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg shadow-primary/20"
                                    style={{ backgroundColor: currentPrimary }}
                                >
                                    ADD TO CART
                                </div>
                            </div>
                            <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-widest">Mobile View Concept</p>
                        </CardContent>
                        <CardFooter className="bg-muted/30 border-t p-4">
                            <Button
                                type="submit"
                                disabled={!isDirty || updateMutation.isPending}
                                className="w-full rounded-xl"
                            >
                                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Branding</>}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </form>
        </div>
    );
}
