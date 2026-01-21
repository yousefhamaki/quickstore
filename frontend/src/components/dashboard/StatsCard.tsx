import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
}

export function StatsCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    className
}: StatsCardProps) {
    return (
        <Card className={cn("overflow-hidden group transition-all duration-300 hover:shadow-md", className)}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary transition-colors">
                        <Icon className="h-4 w-4 text-primary group-hover:text-primary-foreground transition-colors" />
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
