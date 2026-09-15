'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import * as customerAuthService from '../services/customerAuthService';
import type { Customer } from '../services/customerAuthService';

interface CustomerAuthContextType {
    customer: Customer | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: { email: string; password: string; firstName?: string; lastName?: string; phone?: string }) => Promise<void>;
    logout: () => void;
    refresh: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

// Scoped to a single store (storeId is a required prop, not read from any
// global session) — a customer account only ever exists within one store's
// context, unlike the merchant/admin AuthProvider which is global.
export const CustomerAuthProvider = ({ children, storeId }: { children: ReactNode; storeId: string }) => {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        const token = customerAuthService.getCustomerToken(storeId);
        if (!token) {
            setCustomer(null);
            setIsLoading(false);
            return;
        }
        try {
            const profile = await customerAuthService.getMyProfile(storeId);
            setCustomer(profile);
        } catch {
            // Expired/invalid token — drop it silently, the shopper is
            // simply treated as logged out rather than shown an error.
            customerAuthService.clearCustomerToken(storeId);
            setCustomer(null);
        } finally {
            setIsLoading(false);
        }
    }, [storeId]);

    useEffect(() => {
        setIsLoading(true);
        refresh();
    }, [refresh]);

    const login = async (email: string, password: string) => {
        const { token, customer: loggedInCustomer } = await customerAuthService.loginCustomer(storeId, email, password);
        customerAuthService.setCustomerToken(storeId, token);
        setCustomer(loggedInCustomer);
    };

    const register = async (data: { email: string; password: string; firstName?: string; lastName?: string; phone?: string }) => {
        const { token, customer: newCustomer } = await customerAuthService.registerCustomer(storeId, data);
        customerAuthService.setCustomerToken(storeId, token);
        setCustomer(newCustomer);
    };

    const logout = () => {
        customerAuthService.clearCustomerToken(storeId);
        setCustomer(null);
    };

    return (
        <CustomerAuthContext.Provider value={{ customer, isLoading, login, register, logout, refresh }}>
            {children}
        </CustomerAuthContext.Provider>
    );
};

export const useCustomerAuth = () => {
    const context = useContext(CustomerAuthContext);
    if (context === undefined) {
        throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
    }
    return context;
};
