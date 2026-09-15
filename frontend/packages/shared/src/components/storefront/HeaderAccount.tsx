'use client';

import { useCustomerAuth } from "@shared/context/CustomerAuthContext";
import { User } from "lucide-react";
import Link from "next/link";

export function HeaderAccount() {
    const { customer, isLoading } = useCustomerAuth();

    return (
        <Link
            href="/account"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors relative group"
            title={!isLoading && customer ? (customer.firstName || customer.email) : undefined}
        >
            <User
                size={20}
                className="text-gray-400 transition-transform group-hover:scale-110 group-hover:text-primary"
            />
            {!isLoading && customer && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
            )}
        </Link>
    );
}
