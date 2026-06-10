'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../services/api';

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

            // Decode the JWT payload to get the user ID embedded in the token.
            // This is NOT a security check (no signature verification), it is
            // purely used to detect a stale localStorage user from a different account.
            let tokenUserId: string | null = null;
            try {
                const payloadBase64 = storedToken.split('.')[1];
                if (payloadBase64) {
                    const decoded = JSON.parse(atob(payloadBase64)) as { id?: string; sub?: string };
                    tokenUserId = decoded.id || decoded.sub || null;
                }
            } catch {
                // Malformed token — will be rejected by the server anyway
            }

            let cachedUser: User | null = null;
            if (storedUser) {
                try {
                    cachedUser = JSON.parse(storedUser) as User;
                } catch (e) {
                    console.error('Failed to parse stored user:', e);
                }
            }

            // Only trust the cached user when the token's ID matches.
            // If there is a mismatch the stale entry belongs to a different account.
            const cacheIsValid = cachedUser && tokenUserId && cachedUser._id === tokenUserId;

            if (cacheIsValid && cachedUser) {
                setUser(cachedUser);
            } else {
                // Clear any stale/mismatched user data and fetch fresh profile.
                if (!cacheIsValid) {
                    localStorage.removeItem('user');
                }
                api.get('/auth/profile').then(res => {
                    const userData = res.data as User;
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

        // Intent Preservation: check if there is a 'redirect' query parameter
        const searchParams = new URLSearchParams(window.location.search);
        const redirect = searchParams.get('redirect');
        
        // Safety check for internal redirects
        if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
            router.push(redirect);
            return;
        }

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
