'use client';

import { CartProvider } from "@shared/context/CartContext";
import { ReactNode } from "react";

export function CartWrapper({ children, storeId }: { children: ReactNode; storeId: string }) {
    return (
        <CartProvider storeId={storeId}>
            {children}
        </CartProvider>
    );
}
