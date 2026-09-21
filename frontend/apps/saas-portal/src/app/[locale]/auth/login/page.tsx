'use client';

import React, { useState } from 'react';
import { useAuth } from '@shared/context/AuthContext';
import api from '@shared/services/api';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { PasswordInput } from '@shared/components/ui/password-input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@shared/components/ui/card';
import { Label } from '@shared/components/ui/label';
import Link from 'next/link';
import { Logo } from '@shared/components/Logo';
import GoogleLoginButton from '@shared/components/auth/GoogleLoginButton';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';
import { useSearchParams } from 'next/navigation';
import { verifyTwoFactorLogin, resendTwoFactorEmailCode } from '@shared/services/securityService';

export default function LoginPage() {
    const t = useTranslations('auth');
    const commonT = useTranslations('common');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    // Set once the password step succeeds but the account has 2FA enabled —
    // switches the form over to the code-entry step. See
    // securityController.verifyTwoFactorLogin on the backend.
    const [twoFactorChallenge, setTwoFactorChallenge] = useState<{ challengeToken: string; method: 'totp' | 'email' } | null>(null);
    const [code, setCode] = useState('');
    const [useBackupCode, setUseBackupCode] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    let redirect = '';
    try {
        const searchParams = useSearchParams();
        redirect = searchParams.get('redirect') || '';
    } catch (e) { }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', { email, password });
            const data = response.data as any;

            if (data.requires2FA) {
                setTwoFactorChallenge({ challengeToken: data.challengeToken, method: data.method });
                if (data.method === 'email') setResendCooldown(30);
                return;
            }

            login(data.token, data);
        } catch (err: any) {
            setError(err.response?.data?.message || t('errors.invalidCredentials'));
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyTwoFactor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!twoFactorChallenge) return;
        setError('');
        setLoading(true);

        try {
            const result = useBackupCode
                ? await verifyTwoFactorLogin(twoFactorChallenge.challengeToken, { backupCode: code })
                : await verifyTwoFactorLogin(twoFactorChallenge.challengeToken, { code });
            login(result.token, result as any);
        } catch (err: any) {
            setError(err.response?.data?.message || t('login.twoFactor.invalidCode'));
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!twoFactorChallenge || resendCooldown > 0) return;
        try {
            await resendTwoFactorEmailCode(twoFactorChallenge.challengeToken);
            setResendCooldown(30);
        } catch (err: any) {
            setError(err.response?.data?.message || t('login.twoFactor.invalidCode'));
        }
    };

    React.useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
                <LanguageSwitcher />
            </div>

            <Link href="/" className="group mb-8">
                <Logo
                    size={48}
                    label={commonT('brand.name').toUpperCase()}
                    wordmarkClassName="text-3xl font-black tracking-tighter text-gray-900"
                    className="group-hover:scale-105 transition-transform duration-300"
                />
            </Link>

            <Card className="w-full max-w-md shadow-lg border-0 bg-white/80 backdrop-blur-md">
                {twoFactorChallenge ? (
                    <>
                        <CardHeader className="space-y-1 text-center">
                            <CardTitle className="text-3xl font-bold tracking-tight text-gray-900">{t('login.twoFactor.title')}</CardTitle>
                            <CardDescription className="text-gray-500">
                                {twoFactorChallenge.method === 'totp'
                                    ? t('login.twoFactor.subtitleTotp')
                                    : t('login.twoFactor.subtitleEmail')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleVerifyTwoFactor} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="code">
                                        {useBackupCode ? t('login.twoFactor.backupCodeLabel') : t('login.twoFactor.codeLabel')}
                                    </Label>
                                    <Input
                                        id="code"
                                        placeholder={useBackupCode ? 'a1b2c-d3e4f' : '123456'}
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        required
                                        autoFocus
                                        maxLength={useBackupCode ? 11 : 6}
                                        className="bg-white/50 text-center tracking-widest text-lg"
                                    />
                                </div>

                                {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 transition duration-200"
                                    disabled={loading}
                                >
                                    {loading ? t('login.loggingIn') : t('login.twoFactor.verify')}
                                </Button>

                                <div className="flex items-center justify-between text-sm">
                                    <button
                                        type="button"
                                        className="text-blue-600 hover:underline font-medium"
                                        onClick={() => { setUseBackupCode((v) => !v); setCode(''); setError(''); }}
                                    >
                                        {useBackupCode ? t('login.twoFactor.useCodeInstead') : t('login.twoFactor.useBackupInstead')}
                                    </button>
                                    {twoFactorChallenge.method === 'email' && !useBackupCode && (
                                        <button
                                            type="button"
                                            className="text-gray-500 hover:underline font-medium disabled:opacity-50 disabled:no-underline"
                                            onClick={handleResendCode}
                                            disabled={resendCooldown > 0}
                                        >
                                            {resendCooldown > 0 ? t('login.twoFactor.resendIn', { seconds: resendCooldown }) : t('login.twoFactor.resend')}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4 text-center border-t py-6 bg-gray-50/50 rounded-b-xl">
                            <button
                                type="button"
                                className="text-sm text-gray-500 hover:underline font-medium"
                                onClick={() => { setTwoFactorChallenge(null); setCode(''); setError(''); setUseBackupCode(false); }}
                            >
                                {t('login.twoFactor.backToLogin')}
                            </button>
                        </CardFooter>
                    </>
                ) : (
                    <>
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
                                    <PasswordInput
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="bg-white/50"
                                    />
                                </div>
                                {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 transition duration-200"
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
                                <Link href={`/auth/register${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="text-blue-600 hover:underline font-semibold">
                                    {t('login.signUp')}
                                </Link>
                            </p>
                        </CardFooter>
                    </>
                )}
            </Card>
        </div>
    );
}
