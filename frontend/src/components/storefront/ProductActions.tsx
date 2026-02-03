'use client';

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Plus, Minus, ShoppingCart, Heart, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function ProductActions({ product }: { product: any }) {
    const t = useTranslations('store.product');
    const [quantity, setQuantity] = useState(1);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const { addToCart } = useCart();

    const handleAddToCart = () => {
        // Validation: Ensure all options are selected
        const hasOptions = product.options && product.options.length > 0;
        if (hasOptions) {
            const missingOptions = product.options.filter((opt: any) => !selectedOptions[opt.name]);
            if (missingOptions.length > 0) {
                toast.error(t('selectOption', { options: missingOptions.map((o: any) => o.name).join(', ') }), {
                    icon: <AlertCircle className="text-red-500" />
                });
                return;
            }
        }

        addToCart(product, quantity, selectedOptions);
        toast.success(t('addedToCart', { quantity, name: product.name }));
    };

    const handleOptionSelect = (optionName: string, value: string) => {
        setSelectedOptions(prev => ({ ...prev, [optionName]: value }));
    };

    return (
        <div className="space-y-8 pt-4">
            {/* Options Selection */}
            {product.options && product.options.length > 0 && (
                <div className="space-y-6">
                    {product.options.map((option: any) => (
                        <div key={option.name} className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold uppercase tracking-widest text-gray-400">
                                    {option.name}
                                </label>
                                {selectedOptions[option.name] && (
                                    <span className="text-xs font-bold text-primary">
                                        {selectedOptions[option.name]}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {option.values.map((value: string) => (
                                    <button
                                        key={value}
                                        onClick={() => handleOptionSelect(option.name, value)}
                                        className={cn(
                                            "h-12 px-6 rounded-2xl text-sm font-bold border-2 transition-all duration-300",
                                            selectedOptions[option.name] === value
                                                ? "border-primary bg-primary text-white shadow-lg scale-105"
                                                : "border-gray-100 bg-white text-gray-600 hover:border-gray-200"
                                        )}
                                    >
                                        {value}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Quantity and Cart */}
            <div className="flex flex-col md:flex-row items-center gap-6 pt-4">
                <div className="flex items-center bg-gray-50 rounded-[24px] p-1 border w-full md:w-auto">
                    <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-14 h-14 flex items-center justify-center hover:bg-white rounded-[20px] transition-all"
                    >
                        <Minus size={18} />
                    </button>
                    <span className="w-14 text-center font-black text-lg">{quantity}</span>
                    <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-14 h-14 flex items-center justify-center hover:bg-white rounded-[20px] transition-all"
                    >
                        <Plus size={18} />
                    </button>
                </div>
                <div className="flex-1 flex gap-3 w-full">
                    <button
                        onClick={handleAddToCart}
                        className="flex-1 store-button h-16 flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-transform"
                    >
                        <ShoppingCart size={20} className="stroke-[3]" /> {t('addToCart')}
                    </button>
                    <button className="w-16 h-16 rounded-[24px] border-2 border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <Heart size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
