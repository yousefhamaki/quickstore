'use client';

import { OnboardingChecklist as IChecklist } from "@/types/store";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface OnboardingChecklistProps {
    checklist: IChecklist;
    storeId: string;
}

export function OnboardingChecklist({ checklist, storeId }: OnboardingChecklistProps) {
    const steps = [
        {
            ...checklist.checklist.storeInfo,
            key: 'storeInfo',
            label: 'Store Information',
            href: `/dashboard/stores/${storeId}/settings/general`,
        },
        {
            ...checklist.checklist.branding,
            key: 'branding',
            label: 'Brand Identity',
            href: `/dashboard/stores/${storeId}/settings/general`,
        },
        {
            ...checklist.checklist.products,
            key: 'products',
            label: `Add Products (${checklist.checklist.products.current}/${checklist.checklist.products.target})`,
            href: `/dashboard/stores/${storeId}/products/new`,
        },
        {
            ...checklist.checklist.payment,
            key: 'payment',
            label: 'Payment Setup',
            href: `/dashboard/stores/${storeId}/settings/payments`,
        },
        {
            ...checklist.checklist.shipping,
            key: 'shipping',
            label: 'Shipping Zones',
            href: `/dashboard/stores/${storeId}/settings/shipping`,
        },
        {
            ...checklist.checklist.policies,
            key: 'policies',
            label: 'Legal Policies',
            href: `/dashboard/stores/${storeId}/settings/policies`,
        },
    ];

    return (
        <Card className="border-primary/20 bg-primary/[0.02]">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        Store Setup Progress
                    </CardTitle>
                    <span className="text-sm font-bold text-primary">
                        {checklist.progress.percentage}%
                    </span>
                </div>
                <Progress value={checklist.progress.percentage} className="h-2" />
            </CardHeader>
            <CardContent className="grid gap-2">
                {steps.map((step) => (
                    <div
                        key={step.key}
                        className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-all",
                            step.completed
                                ? "bg-muted/50 border-transparent opacity-70"
                                : "bg-background border-border hover:border-primary/50"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            {step.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                                <Circle className="w-5 h-5 text-muted-foreground" />
                            )}
                            <span className={cn(
                                "text-sm font-medium",
                                step.completed && "text-muted-foreground line-through"
                            )}>
                                {step.label}
                            </span>
                        </div>
                        {!step.completed && (
                            <Button asChild variant="ghost" size="sm" className="h-8 group">
                                <Link href={step.href}>
                                    Setup
                                    <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                                </Link>
                            </Button>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
