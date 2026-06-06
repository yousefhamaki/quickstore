import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 grayscale opacity-50">
            <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="flex flex-col items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="p-8 rounded-3xl border border-border/50 bg-card space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                </div>
            </div>
        </div>
    );
}
