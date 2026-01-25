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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    CreditCard,
    Info,
    Save,
    Loader2,
    Wallet,
    Building,
    CheckCircle2,
    Smartphone
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export default function PaymentSettings({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading } = useStore(storeId);
    const updateMutation = useUpdateStore(storeId);

    const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm({
        values: store ? {
            payment: {
                methods: store.settings?.payment?.methods || [],
                instapayNumber: store.settings?.payment?.instapayNumber || "",
                vcashNumber: store.settings?.payment?.vcashNumber || "",
                bankDetails: {
                    bankName: store.settings?.payment?.bankDetails?.bankName || "",
                    accountNumber: store.settings?.payment?.bankDetails?.accountNumber || "",
                    accountName: store.settings?.payment?.bankDetails?.accountName || "",
                }
            }
        } : undefined
    });

    const activeMethods = watch("payment.methods") || [];

    const toggleMethod = (method: string) => {
        const current = [...activeMethods];
        if (current.includes(method)) {
            setValue("payment.methods", current.filter(m => m !== method), { shouldDirty: true });
        } else {
            setValue("payment.methods", [...current, method], { shouldDirty: true });
        }
    };

    const onSubmit = handleSubmit(async (data) => {
        await updateMutation.mutateAsync({ settings: { ...store?.settings, payment: data.payment } });
    });

    if (isLoading) return <div className="p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-20">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Payment Methods</h1>
                <p className="text-muted-foreground">Configure how you receive payments from customers.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-8">
                {/* Methods Selection */}
                <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                            Available Methods
                        </CardTitle>
                        <CardDescription>Select which payment methods are enabled for your customers.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 rounded-xl border bg-background hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Cash on Delivery</p>
                                    <p className="text-xs text-muted-foreground">Pay when receiving items</p>
                                </div>
                            </div>
                            <Switch
                                checked={activeMethods.includes('cod')}
                                onCheckedChange={() => toggleMethod('cod')}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border bg-background hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                    <Building className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Bank Transfer</p>
                                    <p className="text-xs text-muted-foreground">Wire transfer to bank account</p>
                                </div>
                            </div>
                            <Switch
                                checked={activeMethods.includes('bank_transfer')}
                                onCheckedChange={() => toggleMethod('bank_transfer')}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border bg-background hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-pink-100 text-pink-600">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Instapay</p>
                                    <p className="text-xs text-muted-foreground">Direct P2P App Transfer</p>
                                </div>
                            </div>
                            <Switch
                                checked={activeMethods.includes('instapay')}
                                onCheckedChange={() => toggleMethod('instapay')}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border bg-background hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-red-100 text-red-600">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Vodafone Cash</p>
                                    <p className="text-xs text-muted-foreground">Mobile wallet transfer</p>
                                </div>
                            </div>
                            <Switch
                                checked={activeMethods.includes('vodafone_cash')}
                                onCheckedChange={() => toggleMethod('vodafone_cash')}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Peer-to-Peer Payments */}
                <Card className={cn(
                    "border-2 shadow-sm rounded-2xl overflow-hidden transition-all",
                    (!activeMethods.includes('instapay') && !activeMethods.includes('vodafone_cash')) && "opacity-50 grayscale pointer-events-none"
                )}>
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-primary" />
                            Direct Wallets Info
                        </CardTitle>
                        <CardDescription>Numbers for customers to transfer to.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="instapay">Instapay Link / Address</Label>
                                <Input id="instapay" placeholder="e.g. name@instapay" {...register("payment.instapayNumber")} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vcash">Vodafone Cash Number</Label>
                                <Input id="vcash" placeholder="e.g. 010XXXXXXXX" {...register("payment.vcashNumber")} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bank Transfer */}
                <Card className={cn(
                    "border-2 shadow-sm rounded-2xl overflow-hidden transition-all",
                    !activeMethods.includes('bank_transfer') && "opacity-50 grayscale pointer-events-none"
                )}>
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building className="w-5 h-5 text-primary" />
                            Bank Transfer Details
                        </CardTitle>
                        <CardDescription>Provide your bank account for wire transfers.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Bank Name</Label>
                                    <Input {...register("payment.bankDetails.bankName")} placeholder="e.g. CIB, QNB..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Account Name</Label>
                                    <Input {...register("payment.bankDetails.accountName")} placeholder="The name on the account" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Account Number / IBAN</Label>
                                <Input {...register("payment.bankDetails.accountNumber")} placeholder="Full IBAN or account number" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Info Card */}
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                    <Info className="w-5 h-5 text-primary mt-0.5" />
                    <p className="text-sm text-primary/80 leading-relaxed">
                        Currently, Buildora supports offline payment methods where you verify receipts manually.
                        Enable the methods you want to offer, and fill in the details so customers can pay you.
                    </p>
                </div>

                {/* Save Button */}
                <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background/80 backdrop-blur-md border-t p-4 z-50 flex items-center justify-end">
                    <Button
                        type="submit"
                        disabled={!isDirty || updateMutation.isPending}
                        className="rounded-full px-10 shadow-lg shadow-primary/20"
                    >
                        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Payments</>}
                    </Button>
                </div>
            </form>
        </div>
    );
}
