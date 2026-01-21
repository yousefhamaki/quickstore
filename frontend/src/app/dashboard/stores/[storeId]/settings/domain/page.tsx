'use client';

import { use } from "react";
import { useStore } from "@/lib/hooks/useStore";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Globe,
    ExternalLink,
    ShieldCheck,
    AlertCircle,
    Copy,
    Check,
    Loader2
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function DomainSettings({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading } = useStore(storeId);
    const [copied, setCopied] = useState(false);

    if (isLoading) return <div className="p-8"><Loader2 className="animate-spin text-primary" /></div>;
    if (!store) return <div className="p-8">Store not found</div>;

    const fullDomain = `${store.domain.subdomain}.quickstore.live`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(fullDomain);
        setCopied(true);
        toast.success("Domain copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
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
                                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
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
                                    All QuickStore subdomains come with automatic HTTPS/SSL protection to keep your customers' data safe.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Custom Domains Placeholder */}
                <Card className="border-2 border-dashed shadow-sm rounded-2xl overflow-hidden opacity-80 transition-all hover:opacity-100 group">
                    <CardHeader className="bg-muted/10 border-b border-dashed">
                        <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground group-hover:text-foreground">
                            <Globe className="w-5 h-5" />
                            Custom Domain
                        </CardTitle>
                        <CardDescription>Connect your own domain (e.g. www.yourshop.com)</CardDescription>
                    </CardHeader>
                    <CardContent className="p-12 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                            <AlertCircle className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold">Upgrade to Premium</h4>
                            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                Custom domain connections are available on the **Scale** and **Pro** plans.
                            </p>
                        </div>
                        <Button variant="secondary" className="rounded-full px-8">
                            View Plans
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
