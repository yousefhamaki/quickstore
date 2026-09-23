import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@shared/components/ui/card";
import { cn } from "@shared/lib/utils";
import { Skeleton } from "@shared/components/ui/skeleton";

// Opt-in per-card color so a stat grid can read as distinct metrics at a
// glance instead of identical gray boxes. Left undefined, a card keeps its
// original neutral --primary badge — existing callers are unaffected.
const ACCENTS = {
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-600",
    violet: "bg-violet-50 text-violet-600 group-hover:bg-violet-600",
    amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-600",
    green: "bg-green-50 text-green-600 group-hover:bg-green-600",
    teal: "bg-teal-50 text-teal-600 group-hover:bg-teal-600",
    indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600",
} as const;
export type StatsCardAccent = keyof typeof ACCENTS;

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    trend?: {
        value: number;
        isUp: boolean;
    };
    className?: string;
    isLoading?: boolean;
    accent?: StatsCardAccent;
}

export function StatsCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    className,
    isLoading,
    accent
}: StatsCardProps) {
    if (isLoading) {
        return (
            <Card className={cn("overflow-hidden", className)}>
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-40" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl", className)}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
                    <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        accent ? ACCENTS[accent] : "bg-primary/10 group-hover:bg-primary"
                    )}>
                        <Icon className={cn(
                            "h-4 w-4 transition-colors",
                            accent ? "group-hover:text-white" : "text-primary group-hover:text-primary-foreground"
                        )} />
                    </div>
                </div>
                <div className="mt-4 flex items-end justify-between">
                    <div>
                        <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
                        {description && (
                            <p className="text-xs text-muted-foreground mt-1">
                                {description}
                            </p>
                        )}
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                            trend.isUp ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                        )}>
                            {trend.isUp ? "+" : "-"}{Math.abs(trend.value)}%
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
