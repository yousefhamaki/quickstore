'use client';

import { Store } from "@/types/store";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import {
    Settings,
    ExternalLink,
    BarChart3,
    Package,
    ShoppingCart,
    Eye,
    Rocket
} from "lucide-react";
import Link from "next/link";
import { usePauseStore, useResumeStore } from "@/lib/hooks/useStores";
import { useState } from "react";

interface StoreCardProps {
    store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
    const pauseMutation = usePauseStore(store._id);
    const resumeMutation = useResumeStore(store._id);
    const storeUrl = `https://${store.domain.subdomain}.quickstore.live`;

    return (
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/20 group">
            <CardHeader className="pb-3 border-b bg-muted/30">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <h3 className="font-bold text-lg leading-none group-hover:text-primary transition-colors">
                            {store.name}
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                            {store.domain.subdomain}.quickstore.live
                        </p>
                    </div>
                    <StatusBadge status={store.status} />
                </div>
            </CardHeader>

            <CardContent className="pt-6 pb-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Products</p>
                        <div className="flex items-center justify-center gap-1 font-semibold">
                            <Package className="w-3.5 h-3.5 text-primary" />
                            {store.stats.totalProducts}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Orders</p>
                        <div className="flex items-center justify-center gap-1 font-semibold">
                            <ShoppingCart className="w-3.5 h-3.5 text-primary" />
                            {store.stats.totalOrders}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Revenue</p>
                        <div className="flex items-center justify-center gap-1 font-semibold text-emerald-600">
                            <BarChart3 className="w-3.5 h-3.5" />
                            {store.stats.totalRevenue.toLocaleString()}
                        </div>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-2 p-4 grid grid-cols-2 gap-2 border-t bg-muted/10">
                <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/dashboard/stores/${store._id}`}>
                        <Settings className="w-4 h-4 mr-2" />
                        Manage
                    </Link>
                </Button>

                <Button asChild variant="secondary" size="sm" className="w-full">
                    <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Visit Site
                    </a>
                </Button>

                {store.status === 'draft' && (
                    <Button asChild variant="default" size="sm" className="col-span-2 w-full bg-emerald-600 hover:bg-emerald-700">
                        <Link href={`/dashboard/stores/${store._id}`}>
                            <Rocket className="w-4 h-4 mr-2" />
                            Finish Setup
                        </Link>
                    </Button>
                )}

                {store.status === 'live' && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="col-span-2 w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={() => pauseMutation.mutate()}
                        disabled={pauseMutation.isPending}
                    >
                        Pause Store
                    </Button>
                )}

                {store.status === 'paused' && (
                    <Button
                        variant="default"
                        size="sm"
                        className="col-span-2 w-full"
                        onClick={() => resumeMutation.mutate()}
                        disabled={resumeMutation.isPending}
                    >
                        Resume Store
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
