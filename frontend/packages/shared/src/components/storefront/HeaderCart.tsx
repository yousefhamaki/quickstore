'use client';

import { useEffect, useState } from "react";
import { useCart } from "@shared/context/CartContext";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { cn } from "@shared/lib/utils";
import { CART_ICON_ELEMENT_ID, CART_FLY_LANDED_EVENT } from "@shared/lib/flyToCart";

export function HeaderCart({ subdomain }: { subdomain: string }) {
    const { getCartCount } = useCart();
    const count = getCartCount();
    // Bumps the icon the instant a flyToCart() clone lands on it (see
    // ProductActions.tsx) — listened on `window` rather than this element
    // directly since the dispatch site has no React ref to this component.
    const [isBumping, setIsBumping] = useState(false);

    useEffect(() => {
        const onLanded = () => {
            setIsBumping(true);
            window.setTimeout(() => setIsBumping(false), 550);
        };
        window.addEventListener(CART_FLY_LANDED_EVENT, onLanded);
        return () => window.removeEventListener(CART_FLY_LANDED_EVENT, onLanded);
    }, []);

    return (
        <Link
            id={CART_ICON_ELEMENT_ID}
            href={`/store/${subdomain}/checkout`}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors relative group"
        >
            <ShoppingCart
                size={20}
                className={cn(
                    "transition-transform group-hover:scale-110",
                    count > 0 ? "text-primary" : "text-gray-400",
                    isBumping && "animate-cart-bump"
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
