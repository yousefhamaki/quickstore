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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    FileText,
    Save,
    Loader2,
    ShieldCheck
} from "lucide-react";

export default function PolicySettings({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading } = useStore(storeId);
    const updateMutation = useUpdateStore(storeId);

    const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
        values: store ? {
            policies: {
                returnPolicy: store.settings?.policies?.returnPolicy || "",
                privacyPolicy: store.settings?.policies?.privacyPolicy || "",
                termsOfService: store.settings?.policies?.termsOfService || "",
                shippingPolicy: store.settings?.policies?.shippingPolicy || "",
            }
        } : undefined
    });

    const onSubmit = handleSubmit(async (data) => {
        await updateMutation.mutateAsync({ settings: { ...store?.settings, policies: data.policies } });
    });

    if (isLoading) return <div className="p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-20">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Legal & Policies</h1>
                <p className="text-muted-foreground">Define your store's rules and build trust with customers.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-8">
                <div className="grid grid-cols-1 gap-8">
                    {/* Return Policy */}
                    <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Refund & Return Policy
                            </CardTitle>
                            <CardDescription>How do you handle returns and refunds?</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Textarea
                                {...register("policies.returnPolicy")}
                                rows={6}
                                placeholder="State clearly if you accept returns, under what conditions, and how long the process takes."
                                className="rounded-xl border-gray-200"
                            />
                        </CardContent>
                    </Card>

                    {/* Shipping Policy */}
                    <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Shipping Policy
                            </CardTitle>
                            <CardDescription>Delivery times, international shipping, etc.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Textarea
                                {...register("policies.shippingPolicy")}
                                rows={6}
                                placeholder="Explain how long delivery takes and any other information related to the shipping process."
                                className="rounded-xl border-gray-200"
                            />
                        </CardContent>
                    </Card>

                    {/* Terms of Service */}
                    <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-primary" />
                                Terms of Service
                            </CardTitle>
                            <CardDescription>The legal agreement between you and the customer.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Textarea
                                {...register("policies.termsOfService")}
                                rows={6}
                                placeholder="Include rules for using your store, liability limits, and governing law."
                                className="rounded-xl border-gray-200"
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Save Button */}
                <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background/80 backdrop-blur-md border-t p-4 z-50 flex items-center justify-end">
                    <Button
                        type="submit"
                        disabled={!isDirty || updateMutation.isPending}
                        className="rounded-full px-10 shadow-lg shadow-primary/20"
                    >
                        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Policies</>}
                    </Button>
                </div>
            </form>
        </div>
    );
}
