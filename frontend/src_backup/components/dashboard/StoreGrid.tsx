'use client';

import { Store } from "@/types/store";
import { StoreCard } from "./StoreCard";
import { Button } from "@/components/ui/button";
import { Plus, Store as StoreIcon } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface StoreGridProps {
    stores?: Store[];
    isLoading: boolean;
}

export function StoreGrid({ stores, isLoading }: StoreGridProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[280px] w-full rounded-xl" />
                ))}
            </div>
        );
    }

    if (!stores || stores.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl bg-muted/30 text-center animate-in fade-in zoom-in duration-300">
                <div className="bg-primary/10 p-6 rounded-full mb-4">
                    <StoreIcon className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">No stores found</h3>
                <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
                    Start your multi-store journey by creating your first online storefront in just a few clicks.
                </p>
                <Button asChild size="lg" className="rounded-full px-8 shadow-xl hover:shadow-primary/20 transition-all">
                    <Link href="/dashboard/stores/new">
                        <Plus className="w-5 h-5 mr-2" />
                        Create Your First Store
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
                <StoreCard key={store._id} store={store} />
            ))}
            <Link
                href="/dashboard/stores/new"
                className="flex flex-col items-center justify-center h-full min-h-[280px] border-2 border-dashed rounded-xl transition-all duration-300 hover:bg-muted/50 hover:border-primary/50 group"
            >
                <div className="bg-muted p-4 rounded-full mb-3 group-hover:bg-primary/10 transition-colors">
                    <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                    Add New Store
                </p>
            </Link>
        </div>
    );
}
