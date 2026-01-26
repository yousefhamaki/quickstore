'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function LoginPage() {
    const t = useTranslations('auth');
    const commonT = useTranslations('common');
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
            setError(err.response?.data?.message || t('errors.invalidCredentials'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
                <LanguageSwitcher />
            </div>

            <Link href="/" className="flex items-center space-x-3 rtl:space-x-reverse group mb-8">
                <div className="relative h-12 w-12 flex-shrink-0">
                    <Image
                        src="/logo.png"
                        alt="Buildora Logo"
                        width={120}
                        height={120}
                        className="object-contain group-hover:scale-110 transition-transform duration-300"
                        priority
                    />
                </div>
                <span className="text-3xl font-black tracking-tighter text-gray-900">{commonT('brand.name').toUpperCase()}</span>
            </Link>

            <Card className="w-full max-w-md shadow-lg border-0 bg-white/80 backdrop-blur-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight text-gray-900">{t('login.title')}</CardTitle>
                    <CardDescription className="text-gray-500">
                        {t('login.subtitle')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">{t('login.email')}</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-white/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">{t('login.password')}</Label>
                                <Link
                                    href="/auth/forgot-password"
                                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                                >
                                    {t('login.forgotPassword')}
                                </Link>
                            </div>
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
                            {loading ? t('login.loggingIn') : t('login.submit')}
                        </Button>
                    </form>
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500 font-medium pb-1">{t('login.orContinueWith')}</span>
                        </div>
                    </div>

                    <GoogleLoginButton />
                </CardContent>
                <CardFooter className="flex flex-col space-y-4 text-center border-t py-6 bg-gray-50/50 rounded-b-xl">
                    <p className="text-sm text-gray-600">
                        {t('login.noAccount')}{' '}
                        <Link href="/auth/register" className="text-blue-600 hover:underline font-semibold">
                            {t('login.signUp')}
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
