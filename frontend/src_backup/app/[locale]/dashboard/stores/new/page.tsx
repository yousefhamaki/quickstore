'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createStoreSchema } from "@/lib/schemas/store";
import { useCreateStore } from "@/lib/hooks/useStores";
import { checkSubdomainAvailability } from "@/lib/api/stores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Store,
    Palette,
    Phone,
    Globe,
    Loader2,
    AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STEPS = [
    { id: 1, title: "Basic Info", icon: Store },
    { id: 2, title: "Branding", icon: Palette },
    { id: 3, title: "Contact", icon: Phone },
    { id: 4, title: "Domain", icon: Globe },
];

export default function NewStoreWizard() {
    const [step, setStep] = useState(1);
    const [isCheckingDomain, setIsCheckingDomain] = useState(false);
    const router = useRouter();
    const createMutation = useCreateStore();

    const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm({
        resolver: zodResolver(createStoreSchema),
        defaultValues: {
            name: "",
            description: "",
            category: "",
            branding: {
                primaryColor: "#3B82F6",
                secondaryColor: "#1E40AF",
                fontFamily: "Inter",
            },
            contact: {
                email: "",
                phone: "",
                whatsapp: "",
                address: "",
                facebook: "",
                instagram: "",
            },
            domain: {
                subdomain: "",
            }
        },
        mode: "onChange"
    });

    const name = watch("name");
    const subdomain = watch("domain.subdomain");

    // Auto-generate subdomain from name
    const updateSubdomain = (val: string) => {
        if (step === 1) {
            const generated = val.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
            setValue("domain.subdomain", generated, { shouldValidate: true });
        }
    };

    const nextStep = async () => {
        let fields: string[] = [];
        if (step === 1) fields = ["name", "category"];
        if (step === 2) fields = ["branding.primaryColor", "branding.secondaryColor"];
        if (step === 4) {
            await onSubmit();
            return;
        }

        const isValid = await trigger(fields as any);
        if (isValid) setStep(s => s + 1);
    };

    const prevStep = () => setStep(s => s - 1);

    const checkDomain = async () => {
        if (!subdomain || subdomain.length < 3) return;
        setIsCheckingDomain(true);
        try {
            const res = await checkSubdomainAvailability(subdomain);
            if (res.available) {
                toast.success("Subdomain is available!");
            } else {
                toast.error("Subdomain is already taken");
            }
        } catch (err) {
            toast.error("Failed to check availability");
        } finally {
            setIsCheckingDomain(false);
        }
    };

    const onSubmit = handleSubmit(async (data) => {
        try {
            const res = await createMutation.mutateAsync(data);
            router.push(`/dashboard/stores/${res._id}`);
        } catch (err: any) {
            // Check for verification error
            if (err.response?.status === 403 && err.response?.data?.message?.includes('verify your email')) {
                router.push('/auth/verification-required');
            }
        }
    });

    return (
        <div className="min-h-screen bg-muted/20 flex flex-col items-center py-12 px-4">
            <div className="w-full max-w-2xl space-y-8">
                {/* Back Link */}
                <Button variant="ghost" onClick={() => router.back()} className="rounded-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Button>

                {/* Wizard Steps */}
                <div className="flex justify-between items-center relative px-2">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 -z-10" />
                    {STEPS.map((s) => (
                        <div key={s.id} className="flex flex-col items-center gap-2">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                                step === s.id && "bg-primary border-primary text-white scale-110 shadow-lg shadow-primary/20",
                                step > s.id && "bg-emerald-500 border-emerald-500 text-white",
                                step < s.id && "bg-background border-muted text-muted-foreground"
                            )}>
                                {step > s.id ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                            </div>
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest",
                                step === s.id ? "text-primary" : "text-muted-foreground"
                            )}>
                                {s.title}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Form Card */}
                <Card className="border-2 shadow-2xl shadow-primary/5 overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle>{STEPS[step - 1].title}</CardTitle>
                        <CardDescription>Step {step} of 4: Setup your store details</CardDescription>
                    </CardHeader>

                    <CardContent className="pt-8 min-h-[350px]">
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Store Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Enter store name..."
                                        {...register("name")}
                                        onChange={(e) => {
                                            register("name").onChange(e);
                                            updateSubdomain(e.target.value);
                                        }}
                                    />
                                    {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <select
                                        id="category"
                                        {...register("category")}
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    >
                                        <option value="">Select a category</option>
                                        <option value="fashion">Fashion & Apparel</option>
                                        <option value="electronics">Electronics</option>
                                        <option value="home">Home & Decor</option>
                                        <option value="beauty">Beauty & Cosmetics</option>
                                        <option value="other">Other</option>
                                    </select>
                                    {errors.category && <p className="text-xs text-red-500 font-medium">{errors.category.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Textarea id="description" placeholder="Short store bio..." {...register("description")} />
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="primaryColor">Primary Color</Label>
                                        <div className="flex gap-2">
                                            <Input type="color" className="p-1 h-10 w-12 rounded-lg cursor-pointer" {...register("branding.primaryColor")} />
                                            <Input placeholder="#000000" {...register("branding.primaryColor")} className="uppercase" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="secondaryColor">Secondary Color</Label>
                                        <div className="flex gap-2">
                                            <Input type="color" className="p-1 h-10 w-12 rounded-lg cursor-pointer" {...register("branding.secondaryColor")} />
                                            <Input placeholder="#000000" {...register("branding.secondaryColor")} className="uppercase" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="fontFamily">Font Family</Label>
                                    <select
                                        id="fontFamily"
                                        {...register("branding.fontFamily")}
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    >
                                        <option value="Inter">Inter (Modern)</option>
                                        <option value="Roboto">Roboto (Clean)</option>
                                        <option value="Playfair Display">Playfair (Elegant)</option>
                                        <option value="Montserrat">Montserrat (Geometric)</option>
                                    </select>
                                </div>
                                <div className="p-6 border rounded-2xl bg-muted/20" style={{ fontFamily: watch("branding.fontFamily") }}>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-4">Live Branding Preview</p>
                                    <h4 className="text-xl font-bold mb-2" style={{ color: watch("branding.primaryColor") }}>
                                        {name || "Your Store"}
                                    </h4>
                                    <Button size="sm" style={{ backgroundColor: watch("branding.primaryColor") }}>Sample Button</Button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Public Email</Label>
                                    <Input id="email" placeholder="contact@mystore.com" {...register("contact.email")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input id="phone" placeholder="+20..." {...register("contact.phone")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="whatsapp">WhatsApp (for direct chat)</Label>
                                    <Input id="whatsapp" placeholder="+20..." {...register("contact.whatsapp")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="instagram">Instagram Handle</Label>
                                    <Input id="instagram" placeholder="@yourstore" {...register("contact.instagram")} />
                                </div>
                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <Label htmlFor="address">Physical Address (Optional)</Label>
                                    <Textarea id="address" placeholder="Store location..." {...register("contact.address")} />
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-4">
                                    <Label htmlFor="subdomain">Choose your subdomain</Label>
                                    <div className="relative group">
                                        <Input
                                            id="subdomain"
                                            placeholder="my-store"
                                            className="pr-40 h-14 text-lg font-mono rounded-xl border-2"
                                            {...register("domain.subdomain")}
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                className="rounded-lg h-10 px-4"
                                                onClick={checkDomain}
                                                disabled={isCheckingDomain || !subdomain}
                                            >
                                                {isCheckingDomain ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check Availability"}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-4 rounded-xl bg-primary/5 border border-primary/20">
                                        <Globe className="w-4 h-4 text-primary" />
                                        <p className="text-sm font-medium">
                                            Your store will be live at: <span className="font-bold text-primary">{subdomain || "..."}.quickstore.live</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                                        You can add a custom domain (e.g., yourname.com) later from the store settings.
                                        Subdomains are permanent and can only be changed by contacting support.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="bg-muted/30 border-t p-6 flex justify-between">
                        <Button variant="ghost" onClick={prevStep} disabled={step === 1 || createMutation.isPending}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Previous
                        </Button>
                        <Button
                            onClick={nextStep}
                            disabled={createMutation.isPending}
                            className={cn(
                                "px-8 shadow-lg transition-all",
                                step === 4 && "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                            )}
                        >
                            {createMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : step === 4 ? (
                                <>Launch Store <Check className="ml-2 w-4 h-4" /></>
                            ) : (
                                <>Next Step <ArrowRight className="ml-2 w-4 h-4" /></>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
