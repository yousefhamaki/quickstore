'use client';

import React, { useEffect, useState } from 'react';
import ProductForm from '@/components/merchant/ProductForm';
import { getProductById } from '@/services/productService';
import { useParams } from 'next/navigation';

export default function EditProductPage() {
    const params = useParams();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                if (params?.id) {
                    const data = await getProductById(params.id as string);
                    setProduct(data);
                }
            } catch (error) {
                console.error('Failed to fetch product', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [params]);

    if (loading) return <div className="p-8 text-center text-xl font-medium">Loading product...</div>;
    if (!product) return <div className="p-8 text-center text-xl font-medium">Product not found.</div>;

    return (
        <div className="p-8">
            <header className="mb-10">
                <h1 className="text-4xl font-black tracking-tight text-gray-900">Edit Product</h1>
                <p className="text-gray-500 font-medium mt-1">Update your product details</p>
            </header>
            <ProductForm initialData={product} isEdit={true} />
        </div>
    );
}
