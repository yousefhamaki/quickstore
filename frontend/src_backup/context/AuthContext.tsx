'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';

import Cookies from 'js-cookie';

interface User {
    _id: string;
    name: string;
    email: string;
    role: 'merchant' | 'super_admin';
    isVerified: boolean;
    subscriptionPlan?: {
        name: string;
        maxStores: number;
        features: string[];
    };
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const storedToken = Cookies.get('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken) {
            setToken(storedToken);
            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch (e) {
                    console.error('Failed to parse stored user:', e);
                }
            }

            // Only sync with server if we don't have user data
            // This prevents unnecessary API calls on every route change
            if (!storedUser) {
                api.get('/auth/profile').then(res => {
                    const userData = res.data as any;
                    setUser(userData);
                    localStorage.setItem('user', JSON.stringify(userData));
                }).catch(() => {
                    // If token is invalid, it will be handled by axios interceptors
                });
            }
        }
        setIsLoading(false);
    }, []); // Empty dependency array - only run once on mount

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        Cookies.set('token', newToken, { expires: 7 }); // 7 days
        localStorage.setItem('user', JSON.stringify(newUser));

        if (newUser.role === 'super_admin') {
            router.push('/admin');
        } else {
            router.push('/merchant');
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        Cookies.remove('token');
        localStorage.removeItem('user');
        router.push('/auth/login');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
