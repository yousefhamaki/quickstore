'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@shared/services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your email...');
    const { login } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link.');
            return;
        }

        const verify = async () => {
            try {
                const response = await api.post('/auth/verify-email', { token });
                setStatus('success');
                setMessage('Your email has been successfully verified! You can now access all features.');
                const data = response.data as any;
                if (data.token && data.user) {
                    login(data.token, data.user);
                }
            } catch (err: any) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Verification failed or link expired.');
            }
        };

        verify();
    }, [token]);

    return (
        <Card className="w-full max-w-md shadow-lg border-0 bg-white/80 backdrop-blur-md">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    {status === 'loading' && <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />}
                    {status === 'success' && <CheckCircle2 className="w-12 h-12 text-green-500" />}
                    {status === 'error' && <XCircle className="w-12 h-12 text-red-500" />}
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
                    {status === 'loading' ? 'Verifying Email' : status === 'success' ? 'Email Verified!' : 'Verification Failed'}
                </CardTitle>
                <CardDescription>
                    {message}
                </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center pb-8">
                {status === 'loading' ? null : (
                    <Link href="/auth/login">
                        <Button className="font-semibold px-8 rounded-full">
                            {status === 'success' ? 'Continue to Dashboard' : 'Back to Login'}
                        </Button>
                    </Link>
                )}
            </CardFooter>
        </Card>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Suspense fallback={<div className="text-center">Loading...</div>}>
                <VerifyEmailContent />
            </Suspense>
        </div>
    );
}
