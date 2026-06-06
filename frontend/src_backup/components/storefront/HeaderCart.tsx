'use client';

import { useCart } from "@/context/CartContext";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function HeaderCart() {
    const { getCartCount } = useCart();
    const count = getCartCount();

    return (
        <Link
            href="/checkout"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors relative group"
        >
            <ShoppingCart
                size={20}
                className={cn(
                    "transition-transform group-hover:scale-110",
                    count > 0 ? "text-primary" : "text-gray-400"
                )}
            />
            {count > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] flex items-center justify-center rounded-full font-bold shadow-lg animate-in zoom-in duration-300">
                    {count}
                </span>
            )}
        </Link>
    );
}
