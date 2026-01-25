'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', { email, password });
            login((response.data as any).token, response.data as any);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <Card className="w-full max-w-md shadow-lg border-0 bg-white/80 backdrop-blur-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight text-gray-900">Welcome Back</CardTitle>
                    <CardDescription className="text-gray-500">
                        Enter your credentials to access your dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-white/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-white/50"
                            />
                        </div>
                        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 transition-all duration-200"
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Sign In'}
                        </Button>
                    </form>
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-gray-50 px-2 text-gray-500 font-medium pb-2">Or sign in with</span>
                        </div>
                    </div>

                    <GoogleLoginButton />
                </CardContent>
                <CardFooter className="flex flex-col space-y-4 text-center">
                    <p className="text-sm text-gray-600">
                        Don't have an account?{' '}
                        <Link href="/auth/register" className="text-blue-600 hover:underline font-semibold">
                            Create an account
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
