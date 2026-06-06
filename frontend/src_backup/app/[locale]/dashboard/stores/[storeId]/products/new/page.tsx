'use client';

import { use } from "react";
import { useTranslations } from "next-intl";
import ProductForm from "@/components/merchant/ProductForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewProductDashboardPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const t = useTranslations("merchant.products.new");

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4">
                <Button asChild variant="ghost" className="w-fit -ml-2 rounded-lg text-muted-foreground hover:text-foreground">
                    <Link href={`/dashboard/stores/${storeId}/products`}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> {t('back')}
                    </Link>
                </Button>
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('subtitle')}</p>
                </div>
            </div>

            <ProductForm />
        </div>
    );
}
