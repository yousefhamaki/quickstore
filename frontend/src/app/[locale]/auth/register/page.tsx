'use client';

import React, { useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

function RegisterForm() {
    const t = useTranslations('auth');
    const searchParams = useSearchParams();
    const planId = searchParams.get('planId');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
            const response = await api.post('/auth/register', {
                name,
                email,
                password,
                role: 'merchant',
                planId
            });
            // Do not login, show success message
            setSuccessMessage((response.data as any).message || 'Registration successful. Please check your email.');
            setName('');
            setEmail('');
            setPassword('');
        } catch (err: any) {
            setError(err.response?.data?.message || t('errors.registrationFailed') || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md shadow-lg border-0 bg-white/80 backdrop-blur-md">
            <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-3xl font-bold tracking-tight text-gray-900">{t('register.title')}</CardTitle>
                <CardDescription className="text-gray-500">
                    {t('register.subtitle')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('register.name')}</Label>
                        <Input
                            id="name"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="bg-white/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">{t('register.email')}</Label>
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
                        <Label htmlFor="password">{t('register.password')}</Label>
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
                    {successMessage && <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md font-medium">{successMessage}</div>}
                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 transition-all duration-200"
                        disabled={loading}
                    >
                        {loading ? t('register.creatingAccount') : t('register.submit')}
                    </Button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500 font-medium pb-1">{t('register.orContinueWith')}</span>
                    </div>
                </div>

                <GoogleLoginButton />

            </CardContent>
            <CardFooter className="flex flex-col space-y-4 text-center border-t py-6 bg-gray-50/50 rounded-b-xl">
                <p className="text-sm text-gray-600">
                    {t('register.haveAccount')}{' '}
                    <Link href="/auth/login" className="text-blue-600 hover:underline font-semibold">
                        {t('register.signIn')}
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}

export default function RegisterPage() {
    const commonT = useTranslations('common');

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

            <Suspense fallback={
                <Card className="w-full max-w-md shadow-lg border-0 bg-white/80 backdrop-blur-md">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-3xl font-bold tracking-tight text-gray-900">Loading...</CardTitle>
                    </CardHeader>
                </Card>
            }>
                <RegisterForm />
            </Suspense>
        </div>
    );
}
