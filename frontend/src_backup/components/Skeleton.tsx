'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div className={cn("animate-pulse rounded-md bg-muted/50", className)} />
    );
}

export function DashboardSkeleton() {
    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32 rounded-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-6 rounded-2xl border border-border/50 bg-card space-y-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-6">
                        <div className="flex justify-between">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-8 w-24" />
                        </div>
                        <Skeleton className="h-64 w-full" />
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-4">
                        <Skeleton className="h-6 w-32" />
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-2 w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TableSkeleton() {
    return (
        <div className="space-y-4 p-8">
            <div className="flex justify-between items-center mb-8">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
            <div className="border border-border/50 rounded-2xl overflow-hidden bg-white">
                <div className="p-4 border-b bg-muted/30">
                    <div className="grid grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-4 w-24" />
                        ))}
                    </div>
                </div>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="p-4 border-b last:border-0">
                        <div className="grid grid-cols-5 gap-4 items-center">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-8 w-8 ml-auto rounded-md" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function FormSkeleton() {
    return (
        <div className="max-w-4xl mx-auto p-8 space-y-8">
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                ))}
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-32 w-full rounded-xl" />
            </div>
            <div className="flex justify-end pt-6 border-t">
                <Skeleton className="h-12 w-32 rounded-xl" />
            </div>
        </div>
    );
}
