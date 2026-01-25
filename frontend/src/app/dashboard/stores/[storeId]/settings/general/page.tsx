'use client';

import { use } from "react";
import { useStore, useUpdateStore } from "@/lib/hooks/useStore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateStoreSchema } from "@/lib/schemas/store";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Loader2,
    Save,
    Trash2,
    Pause,
    Play,
    Globe,
    Palette,
    Mail,
    Smartphone,
    Info
} from "lucide-react";
import { usePauseStore, useResumeStore } from "@/lib/hooks/useStore";
import { Separator } from "@/components/ui/separator";

export default function GeneralSettings({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading } = useStore(storeId);
    const updateMutation = useUpdateStore(storeId);
    const pauseMutation = usePauseStore(storeId);
    const resumeMutation = useResumeStore(storeId);

    const { register, handleSubmit, watch, formState: { errors, isDirty } } = useForm({
        resolver: zodResolver(updateStoreSchema),
        values: store ? {
            name: store.name,
            description: store.description,
            category: store.category,
            branding: {
                primaryColor: store.branding.primaryColor,
                secondaryColor: store.branding.secondaryColor,
                fontFamily: store.branding.fontFamily,
            },
            contact: store.contact,
        } : undefined
    });

    const onSubmit = handleSubmit(async (data) => {
        await updateMutation.mutateAsync(data);
    });

    if (isLoading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;
    if (!store) return <div className="p-8">Store not found</div>;

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-20">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">General Settings</h1>
                <p className="text-muted-foreground">Manage your store core information and brand experience.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-8">
                {/* Core Info */}
                <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Info className="w-5 h-5 text-primary" />
                            Store Information
                        </CardTitle>
                        <CardDescription>Common details about your online business.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Store Name</Label>
                                <Input id="name" {...register("name")} />
                                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Store Category</Label>
                                <select
                                    id="category"
                                    {...register("category")}
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                >
                                    <option value="fashion">Fashion & Apparel</option>
                                    <option value="electronics">Electronics</option>
                                    <option value="home">Home & Decor</option>
                                    <option value="beauty">Beauty & Cosmetics</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Store Description</Label>
                            <Textarea id="description" rows={4} {...register("description")} />
                        </div>
                    </CardContent>
                </Card>

                {/* Branding */}
                <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Palette className="w-5 h-5 text-primary" />
                            Brand Identity
                        </CardTitle>
                        <CardDescription>Colors and typography that define your store.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Primary Color</Label>
                                    <div className="flex gap-2">
                                        <Input type="color" className="p-1 h-10 w-12 rounded-lg" {...register("branding.primaryColor")} />
                                        <Input {...register("branding.primaryColor")} className="uppercase" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Secondary Color</Label>
                                    <div className="flex gap-2">
                                        <Input type="color" className="p-1 h-10 w-12 rounded-lg" {...register("branding.secondaryColor")} />
                                        <Input {...register("branding.secondaryColor")} className="uppercase" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Font Family</Label>
                                    <select {...register("branding.fontFamily")} className="w-full h-10 px-3 rounded-md border border-input bg-background">
                                        <option value="Inter">Inter</option>
                                        <option value="Roboto">Roboto</option>
                                        <option value="Montserrat">Montserrat</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label>Store Preview Snapshot</Label>
                                <div
                                    className="h-40 rounded-3xl border-4 border-dashed p-6 flex flex-col justify-center gap-2 transition-all"
                                    style={{ borderColor: watch("branding.primaryColor"), fontFamily: watch("branding.fontFamily") }}
                                >
                                    <h4 className="text-2xl font-bold" style={{ color: watch("branding.primaryColor") }}>{watch("name")}</h4>
                                    <div className="flex gap-2">
                                        <div className="h-2 w-16 rounded-full" style={{ backgroundColor: watch("branding.primaryColor") }} />
                                        <div className="h-2 w-10 rounded-full" style={{ backgroundColor: watch("branding.secondaryColor") }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Info */}
                <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Mail className="w-5 h-5 text-primary" />
                            Contact Details
                        </CardTitle>
                        <CardDescription>How customers can reach you.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Public Email</Label>
                            <Input {...register("contact.email")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input {...register("contact.phone")} />
                        </div>
                        <div className="space-y-2">
                            <Label>WhatsApp Number</Label>
                            <Input {...register("contact.whatsapp")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Instagram</Label>
                            <Input {...register("contact.instagram")} />
                        </div>
                    </CardContent>
                </Card>

                {/* Domain Info Area (Read Only) */}
                <Card className="border-2 shadow-sm rounded-2xl overflow-hidden bg-muted/5 border-dashed">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Globe className="w-5 h-5 text-primary" />
                            Store Domain
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-primary font-mono">{store.domain.subdomain}.quickstore.live</p>
                            <p className="text-xs text-muted-foreground">This is your permanent Buildora address.</p>
                        </div>
                        <Button variant="secondary" size="sm" asChild className="rounded-full">
                            <a href={`https://${store.domain.subdomain}.quickstore.live`} target="_blank" rel="noopener noreferrer">
                                Visit Store
                            </a>
                        </Button>
                    </CardContent>
                </Card>

                {/* Sticky Actions Bar */}
                <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background/80 backdrop-blur-md border-t p-4 z-50 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                        {isDirty && <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Unsaved changes</span>}
                    </div>
                    <Button
                        type="submit"
                        disabled={!isDirty || updateMutation.isPending}
                        className="rounded-full px-10 shadow-lg shadow-primary/20"
                    >
                        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                    </Button>
                </div>
            </form>

            {/* Danger Zone */}
            <Separator className="my-10" />
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-red-600">Danger Zone</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-red-200 bg-red-50/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold">Status Control</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground mb-4">
                                Temporarily pause sales or resume operations.
                            </p>
                            {store.status === 'live' ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-red-200 text-red-600 bg-white"
                                    onClick={() => pauseMutation.mutate()}
                                    disabled={pauseMutation.isPending}
                                >
                                    <Pause className="w-4 h-4 mr-2" /> Pause Store
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-emerald-200 text-emerald-600 bg-white"
                                    onClick={() => resumeMutation.mutate()}
                                    disabled={resumeMutation.isPending}
                                >
                                    <Play className="w-4 h-4 mr-2" /> Resume Store
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-red-200 bg-red-50/10 opacity-50 cursor-not-allowed">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold">Delete Store</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground mb-4">
                                Permanently delete all data for this store.
                            </p>
                            <Button variant="destructive" size="sm" className="w-full" disabled>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Permanently
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
