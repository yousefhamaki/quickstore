'use client';

import React from 'react';
import ProductForm from '@/components/merchant/ProductForm';

export default function NewProductPage() {
    return (
        <div className="p-8">
            <header className="mb-10">
                <h1 className="text-4xl font-black tracking-tight text-gray-900">Add New Product</h1>
                <p className="text-gray-500 font-medium mt-1">Fill in the details to list your item</p>
            </header>
            <ProductForm />
        </div>
    );
}
