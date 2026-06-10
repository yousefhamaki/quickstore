'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import api from '@shared/services/api';
import { useAuth } from '@shared/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Mail, CheckCircle2, Loader2, LogOut } from 'lucide-react';

export default function VerificationRequiredPage() {
    const { user, logout } = useAuth();
    const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
    const [email, setEmail] = useState(user?.email ?? '');

    const handleResend = async () => {
        if (!email) return;
        setResendStatus('loading');
        try {
            await api.post('/auth/resend-verification', { email });
            setResendStatus('sent');
        } catch {
            setResendStatus('error');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 backdrop-blur-xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                            <Mail className="w-8 h-8" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
                        Email Verification Required
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        Your account is not yet verified. Please check your inbox for the verification link we sent you.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-sm text-amber-800">
                        Check your inbox <strong>(and spam folder)</strong> for an email from Buildora with a verification link.
                    </div>

                    {resendStatus === 'sent' ? (
                        <div className="flex items-center gap-3 bg-green-50 p-4 rounded-lg border border-green-200 text-green-800 text-sm">
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                            <span>A new verification link has been sent! Please check your inbox.</span>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600 font-medium">Didn't get the email? Resend it:</p>
                            <div className="flex gap-2">
                                <Input
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={resendStatus === 'loading'}
                                    className="flex-1"
                                />
                                <Button
                                    onClick={handleResend}
                                    disabled={resendStatus === 'loading' || !email}
                                    className="shrink-0"
                                >
                                    {resendStatus === 'loading' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : 'Resend'}
                                </Button>
                            </div>
                            {resendStatus === 'error' && (
                                <p className="text-xs text-red-500">Something went wrong. Please try again.</p>
                            )}
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
                    <p className="text-xs text-gray-500">
                        Already verified?{' '}
                        <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
                            Log in again to refresh your session
                        </Link>
                    </p>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-gray-600 gap-2"
                        onClick={logout}
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign out
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
