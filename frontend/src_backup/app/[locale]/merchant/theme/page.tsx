'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStores } from "@/lib/hooks/useStores";
import { Loader2 } from "lucide-react";

export default function MerchantThemeRedirect() {
    const router = useRouter();
    const { data: stores, isLoading } = useStores();

    useEffect(() => {
        if (!isLoading && stores) {
            if (stores.length > 0) {
                // Redirect to the first store's theme settings
                router.replace(`/dashboard/stores/${stores[0]._id}/settings/theme`);
            } else {
                // No stores found, go to setup
                router.replace('/merchant/setup');
            }
        }
    }, [stores, isLoading, router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Redirecting to Theme Builder...</p>
        </div>
    );
}
