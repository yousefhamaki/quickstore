'use client';

import { CartProvider } from "@shared/context/CartContext";
import { CustomerAuthProvider } from "@shared/context/CustomerAuthContext";
import { ReactNode } from "react";

export function CartWrapper({ children, storeId }: { children: ReactNode; storeId: string }) {
    return (
        <CustomerAuthProvider storeId={storeId}>
            <CartProvider storeId={storeId}>
                {children}
            </CartProvider>
        </CustomerAuthProvider>
    );
}
