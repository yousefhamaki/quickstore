'use client';

import { use, useEffect, useState } from "react";
import ProductForm from "@/components/merchant/ProductForm";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getProductById } from "@/services/productService";

export default function EditProductDashboardPage({ params }: { params: Promise<{ storeId: string, id: string }> }) {
    const { storeId, id } = use(params);
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const data = await getProductById(id);
                setProduct(data);
            } catch (error) {
                console.error("Failed to fetch product", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    if (loading) return <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
    if (!product) return <div className="p-20 text-center">Product not found</div>;

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4">
                <Button asChild variant="ghost" className="w-fit -ml-2 rounded-lg text-muted-foreground hover:text-foreground">
                    <Link href={`/dashboard/stores/${storeId}/products`}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Products
                    </Link>
                </Button>
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
                    <p className="text-muted-foreground">Modify your product details and inventory.</p>
                </div>
            </div>

            <ProductForm initialData={product} isEdit />
        </div>
    );
}
