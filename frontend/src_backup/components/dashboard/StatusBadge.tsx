import { Badge } from "@/components/ui/badge";
import { StoreStatus } from "@/types/store";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
    status: StoreStatus;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const variants = {
        draft: "bg-amber-100 text-amber-500 border-amber-200 hover:bg-amber-100",
        live: "bg-emerald-100 text-emerald-600 border-emerald-200 hover:bg-emerald-100",
        paused: "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-100",
    };

    const labels = {
        draft: "Draft",
        live: "Live",
        paused: "Paused",
    };

    return (
        <Badge
            variant="outline"
            className={cn(
                "px-2 py-0.5 font-semibold text-xs capitalize transition-colors",
                variants[status],
                className
            )}
        >
            <span className={cn(
                "mr-1.5 h-1.5 w-1.5 rounded-full",
                status === 'draft' && "bg-amber-500",
                status === 'live' && "bg-emerald-500 animate-pulse",
                status === 'paused' && "bg-slate-500"
            )} />
            {labels[status]}
        </Badge>
    );
}
