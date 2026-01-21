'use client';

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Plus, Minus, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ProductActions({ product }: { product: any }) {
    const [quantity, setQuantity] = useState(1);
    const { addToCart } = useCart();

    const handleAddToCart = () => {
        addToCart(product, quantity);
        toast.success(`${quantity} x ${product.name} added to cart!`);
    };

    return (
        <div className="space-y-6 pt-4">
            <div className="flex items-center gap-6">
                <div className="flex items-center bg-gray-100 rounded-full p-1 border">
                    <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-12 h-12 flex items-center justify-center hover:bg-white rounded-full transition-all"
                    >
                        <Minus size={18} />
                    </button>
                    <span className="w-12 text-center font-bold">{quantity}</span>
                    <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-12 h-12 flex items-center justify-center hover:bg-white rounded-full transition-all"
                    >
                        <Plus size={18} />
                    </button>
                </div>
                <div className="flex-1 flex gap-4">
                    <button
                        onClick={handleAddToCart}
                        className="flex-1 store-button h-14 flex items-center justify-center gap-3 shadow-xl shadow-blue-500/10"
                    >
                        <ShoppingCart size={20} /> Add to Cart
                    </button>
                    <button className="w-14 h-14 rounded-full border flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <Heart size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
