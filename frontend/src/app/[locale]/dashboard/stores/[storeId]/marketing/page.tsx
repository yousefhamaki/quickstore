'use client';

import { use } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Megaphone,
    Ticket,
    Target,
    Share2,
    Plus,
    Loader2,
    Lock,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MarketingPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Marketing</h1>
                    <p className="text-muted-foreground text-sm">Grow your business with discounts, ads and tracking.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Discount Coupons */}
                <Card className="border-2 shadow-sm rounded-2xl overflow-hidden group hover:border-primary/50 transition-all">
                    <CardHeader className="bg-muted/30 border-b">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-2">
                            <Ticket className="w-5 h-5" />
                        </div>
                        <CardTitle className="text-lg">Discount Coupons</CardTitle>
                        <CardDescription>Create codes like "SAVE20" for your customers.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Button className="w-full rounded-xl" variant="outline">
                            <Plus className="w-4 h-4 mr-2" /> Create Coupon
                        </Button>
                    </CardContent>
                </Card>

                {/* Tracking Pixels */}
                <Card className="border-2 shadow-sm rounded-2xl overflow-hidden group hover:border-primary/50 transition-all">
                    <CardHeader className="bg-muted/30 border-b">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                            <Target className="w-5 h-5" />
                        </div>
                        <CardTitle className="text-lg">Tracking Pixels</CardTitle>
                        <CardDescription>Connect Meta (Facebook), Google or TikTok pixels.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Button className="w-full rounded-xl" variant="outline">
                            Setup Pixels
                        </Button>
                    </CardContent>
                </Card>

                {/* Social Sharing */}
                <Card className="border-2 shadow-sm rounded-2xl overflow-hidden group hover:border-primary/50 transition-all">
                    <CardHeader className="bg-muted/30 border-b">
                        <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center mb-2">
                            <Share2 className="w-5 h-5" />
                        </div>
                        <CardTitle className="text-lg">Social Sharing</CardTitle>
                        <CardDescription>Enable social share buttons on product pages.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Button className="w-full rounded-xl" variant="outline">
                            Configure Sharing
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Premium Feature Placeholder */}
            <Card className="border-2 border-dashed shadow-sm rounded-3xl overflow-hidden bg-primary/[0.02]">
                <CardContent className="p-12 text-center space-y-6">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                        <Sparkles className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black">AI Marketing Assistant</h2>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            Generate high-converting ad copy and product descriptions automatically using AI.
                        </p>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                        <Badge className="bg-primary/20 text-primary border-primary/30 py-1 px-4">
                            <Lock className="w-3 h-3 mr-2" />
                            Premium Feature
                        </Badge>
                    </div>
                    <Button className="rounded-full px-8 shadow-xl shadow-primary/20">
                        Upgrade to Growth Plan
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
