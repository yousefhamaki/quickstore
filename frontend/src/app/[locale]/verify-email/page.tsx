'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
                // Optional: Auto-login if token returned
                if ((response.data as any).token) {
                    // We might need user data too, but the endpoint currently returns token.
                    // The backend endpoint I wrote: res.json({ message: '...', token: '...' }); 
                    // It doesn't return the user object.
                    // So we cannot auto-login fully unless we fetch profile or update backend.
                    // Let's just redirect to login for safety or fetch profile.
                    // Given the context, redirecting to login is safer and cleaner.
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
