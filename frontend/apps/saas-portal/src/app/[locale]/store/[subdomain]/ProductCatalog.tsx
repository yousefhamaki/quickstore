'use client';

import { useState } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductCatalogProps {
    products: any[];
}

export default function ProductCatalog({ products }: ProductCatalogProps) {
    const t = useTranslations('store.home');
    const tProduct = useTranslations('store.product');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Get unique categories, filtering out any empty or null values
    const categories = [
        { name: t('all'), id: 'all' },
        ...[...new Set(products.map(p => p.category).filter(Boolean))].map(c => ({
            name: c,
            id: c
        }))
    ];

    const filteredProducts = selectedCategory === 'all'
        ? products
        : products.filter(p => p.category === selectedCategory);

    return (
        <section className="container mx-auto px-4 py-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                <h2 className="text-3xl font-black tracking-tighter">{t('ourCollection')}</h2>
                <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                        const isActive = selectedCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-6 py-2 rounded-full border text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${
                                    isActive
                                        ? "bg-black text-white border-black"
                                        : "bg-white text-black border-gray-200 hover:bg-black hover:text-white"
                                }`}
                            >
                                {cat.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {filteredProducts.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                        <ShoppingCart size={24} />
                    </div>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">{t('emptyCatalog')}</p>
                </div>
            ) : (
                <motion.div 
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredProducts.map((product: any) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.25 }}
                                key={product._id}
                            >
                                <Link
                                    href={`/products/${product._id}`}
                                    className="group cursor-pointer space-y-4 block"
                                >
                                    <div className="aspect-[4/5] bg-gray-100 rounded-3xl overflow-hidden relative border shadow-sm group-hover:shadow-xl transition-all duration-500">
                                        {product.images?.[0]?.url ? (
                                            <img
                                                src={product.images[0].url}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <ShoppingCart size={40} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                            <div className="w-full bg-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl">
                                                <Plus size={16} /> {tProduct('viewDetails') || 'View Details'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-2 space-y-1">
                                        <h3 className="font-bold text-lg group-hover:text-primary transition-colors duration-300">{product.name}</h3>
                                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{product.category}</p>
                                        <p className="text-lg font-black mt-2">EGP {(product.price ?? 0).toLocaleString()}</p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
        </section>
    );
}
