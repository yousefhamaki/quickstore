'use client';

import { use, useState } from "react";
import { useStore } from "@shared/lib/hooks/useStore";
import { useBillingOverview } from "@shared/lib/hooks/useBilling";
import { useSetCustomDomain, useVerifyCustomDomain, useRemoveCustomDomain } from "@shared/lib/hooks/useStore";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import {
    Globe,
    ExternalLink,
    ShieldCheck,
    ShieldAlert,
    AlertCircle,
    Copy,
    Check,
    Loader2,
    Trash2,
    RefreshCw
} from "lucide-react";
import { toast } from "sonner";

function CopyableField({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success(`${label} copied`);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <div className="p-3 rounded-xl border-2 bg-muted/5 font-mono text-xs flex items-center justify-between gap-2">
                <span className="truncate">{value}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 rounded-lg" onClick={copy}>
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
            </div>
        </div>
    );
}

export default function DomainSettings({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading } = useStore(storeId);
    const { data: billing, isLoading: billingLoading } = useBillingOverview();
    const [domainInput, setDomainInput] = useState('');

    const setDomainMutation = useSetCustomDomain(storeId);
    const verifyMutation = useVerifyCustomDomain(storeId);
    const removeMutation = useRemoveCustomDomain(storeId);

    if (isLoading || billingLoading) return <div className="p-8"><Loader2 className="animate-spin text-primary" /></div>;
    if (!store) return <div className="p-8">Store not found</div>;

    const fullDomain = `${store.domain.subdomain}.quickstore.live`;
    const hasCustomDomainFeature = !!billing?.plan?.features?.customDomain;
    const domain = store.domain as any;
    const customDomain: string | undefined = domain.customDomain;
    const isVerified: boolean = !!domain.isVerified;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(fullDomain);
        toast.success("Domain copied to clipboard");
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!domainInput.trim()) return;
        setDomainMutation.mutate(domainInput.trim(), {
            onSuccess: () => setDomainInput('')
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Domain Settings</h1>
                <p className="text-muted-foreground">Manage your store's web address and custom domains.</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Primary Domain (Subdomain) */}
                <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-primary" />
                                    Active Domain
                                </CardTitle>
                                <CardDescription>Your current primary store address.</CardDescription>
                            </div>
                            <span className="bg-emerald-500/10 text-emerald-600 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/20">
                                Primary
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 p-4 rounded-xl border-2 bg-muted/5 font-mono text-sm flex items-center justify-between">
                                <span className="truncate">{fullDomain}</span>
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={copyToClipboard}>
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                            <Button asChild className="rounded-xl shadow-lg shadow-primary/20">
                                <a href={`https://${fullDomain}`} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4 mr-2" /> Visit Store
                                </a>
                            </Button>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-primary">SSL Certificate Included</p>
                                <p className="text-xs text-primary/70 leading-relaxed">
                                    All Buildora subdomains come with automatic HTTPS/SSL protection to keep your customers' data safe.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Custom Domain */}
                <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Globe className="w-5 h-5 text-primary" />
                            Custom Domain
                        </CardTitle>
                        <CardDescription>Connect your own domain (e.g. www.yourshop.com)</CardDescription>
                    </CardHeader>

                    {!hasCustomDomainFeature ? (
                        <CardContent className="p-12 text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                                <AlertCircle className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold">Upgrade required</h4>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                    Custom domain connections aren't included in your current plan.
                                </p>
                            </div>
                            <Button asChild variant="secondary" className="rounded-full px-8">
                                <a href="../../../merchant/plans">View Plans</a>
                            </Button>
                        </CardContent>
                    ) : !customDomain ? (
                        <CardContent className="pt-6 space-y-4">
                            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3">
                                <Input
                                    placeholder="shop.yourdomain.com"
                                    value={domainInput}
                                    onChange={(e) => setDomainInput(e.target.value)}
                                    className="flex-1 rounded-xl"
                                />
                                <Button type="submit" disabled={setDomainMutation.isPending} className="rounded-xl">
                                    {setDomainMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect Domain'}
                                </Button>
                            </form>
                            <p className="text-xs text-muted-foreground">
                                You'll need to add a DNS record proving you own the domain before it goes live.
                            </p>
                        </CardContent>
                    ) : (
                        <CardContent className="pt-6 space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-sm font-semibold">{customDomain}</span>
                                    {isVerified ? (
                                        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/20">
                                            <ShieldCheck className="w-3.5 h-3.5" /> Verified
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/20">
                                            <ShieldAlert className="w-3.5 h-3.5" /> Pending verification
                                        </span>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl text-destructive hover:text-destructive"
                                    onClick={() => removeMutation.mutate()}
                                    disabled={removeMutation.isPending}
                                >
                                    {removeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-2" /> Remove</>}
                                </Button>
                            </div>

                            {!isVerified && (
                                <div className="space-y-4 p-4 rounded-xl border-2 border-dashed">
                                    <div>
                                        <p className="text-sm font-bold">1. Add this DNS record at your domain registrar</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            This proves you control {customDomain} — it doesn't route any traffic by itself.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-[80px_1fr_1fr] gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Type</Label>
                                            <div className="p-3 rounded-xl border-2 bg-muted/5 font-mono text-xs">TXT</div>
                                        </div>
                                        <CopyableField
                                            label="Host / Name"
                                            value={setDomainMutation.data?.verification.host || `_buildora-verify.${customDomain}`}
                                        />
                                        <CopyableField
                                            label="Value"
                                            value={setDomainMutation.data?.verification.value || '(shown when you connect the domain)'}
                                        />
                                    </div>

                                    <div className="pt-2 border-t space-y-1">
                                        <p className="text-sm font-bold">2. Point the domain at Buildora</p>
                                        <p className="text-xs text-muted-foreground">
                                            Add a <code className="font-mono">CNAME</code> record for {customDomain} pointing to{' '}
                                            <code className="font-mono">stores.quickstore.live</code>. This is what actually
                                            serves your store — it can be added any time before or after verification.
                                        </p>
                                    </div>

                                    <Button
                                        onClick={() => verifyMutation.mutate()}
                                        disabled={verifyMutation.isPending}
                                        className="rounded-xl w-full md:w-auto"
                                    >
                                        {verifyMutation.isPending
                                            ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            : <RefreshCw className="w-4 h-4 mr-2" />}
                                        Verify Now
                                    </Button>
                                </div>
                            )}

                            {isVerified && (
                                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <p className="text-xs text-emerald-700 leading-relaxed">
                                        Domain ownership verified. As long as its DNS points at Buildora (see CNAME setup above),
                                        your store is reachable at <span className="font-mono">https://{customDomain}</span>.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    )}
                </Card>
            </div>
        </div>
    );
}
