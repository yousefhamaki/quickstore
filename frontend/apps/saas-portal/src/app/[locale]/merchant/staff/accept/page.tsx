'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { PasswordInput } from '@shared/components/ui/password-input';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { acceptStaffInvite, getStaffInvitePreview, InvitePreview } from '@shared/lib/api/staff';

const ROLE_LABEL: Record<string, string> = {
    manager: 'Manager — full access except billing and team management',
    staff: 'Staff — products, orders, and customers only',
};

function AcceptInviteContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';
    const email = searchParams.get('email') || '';
    const { login } = useAuth();

    const [status, setStatus] = useState<'form' | 'submitting' | 'success' | 'error'>('form');
    const [message, setMessage] = useState('');
    const [needsPassword, setNeedsPassword] = useState(false);
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [preview, setPreview] = useState<InvitePreview | null>(null);

    useEffect(() => {
        if (!token || !email) {
            setStatus('error');
            setMessage('This invite link is missing its token or email.');
            return;
        }
        getStaffInvitePreview(token, email)
            .then((data) => {
                setPreview(data);
                setNeedsPassword(data.requiresPassword);
            })
            .catch((err) => {
                setStatus('error');
                setMessage(err.response?.data?.message || 'This invite is invalid or has expired.');
            });
    }, [token, email]);

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setStatus('submitting');
        try {
            const data = await acceptStaffInvite({ token, email, name: name || undefined, password: password || undefined });
            setStatus('success');
            setMessage(`You now have ${data.storeRole} access to ${data.store?.name || 'the store'}.`);
            login(data.token, data.user as any);
        } catch (err: any) {
            if (err.response?.data?.requiresPassword) {
                setNeedsPassword(true);
                setStatus('form');
                setMessage(err.response.data.message);
                return;
            }
            setStatus('error');
            setMessage(err.response?.data?.message || 'This invite is invalid or has expired.');
        }
    };

    if (status === 'error') {
        return (
            <Card className="w-full max-w-md shadow-lg border-0 bg-white/80 backdrop-blur-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <XCircle className="w-12 h-12 text-red-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">Invite Invalid</CardTitle>
                    <CardDescription>{message}</CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-center pb-8">
                    <Link href="/auth/login">
                        <Button className="font-semibold px-8 rounded-full">Back to Login</Button>
                    </Link>
                </CardFooter>
            </Card>
        );
    }

    if (status === 'success') {
        return (
            <Card className="w-full max-w-md shadow-lg border-0 bg-white/80 backdrop-blur-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">Invite Accepted!</CardTitle>
                    <CardDescription>{message}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md shadow-lg border-0 bg-white/80 backdrop-blur-md">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">Join the team</CardTitle>
                <CardDescription>
                    Accepting invite for <strong>{email}</strong>
                    {needsPassword && message ? <div className="mt-2 text-amber-600">{message}</div> : null}
                </CardDescription>
            </CardHeader>
            {preview && (
                <CardContent className="pt-0 pb-2">
                    <div className="rounded-xl border bg-gray-50 p-4 text-sm space-y-1.5">
                        <p>
                            <strong>{preview.inviterName}</strong> invited you to help manage{' '}
                            <strong>{preview.storeName}</strong>.
                        </p>
                        <p className="text-gray-600">
                            Your role will be: <strong className="text-gray-900">{ROLE_LABEL[preview.role] || preview.role}</strong>
                        </p>
                    </div>
                </CardContent>
            )}
            <form onSubmit={submit}>
                <CardContent className="space-y-4">
                    {needsPassword && (
                        <>
                            <div className="space-y-1.5">
                                <Label htmlFor="accept-name">Your name</Label>
                                <Input id="accept-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="accept-password">Create a password</Label>
                                <PasswordInput
                                    id="accept-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="At least 8 characters"
                                    required
                                />
                            </div>
                        </>
                    )}
                    {!needsPassword && (
                        <p className="text-sm text-muted-foreground text-center">
                            Click below to accept and link this invite to your account.
                        </p>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center pb-8">
                    <Button type="submit" className="font-semibold px-8 rounded-full" disabled={status === 'submitting'}>
                        {status === 'submitting' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Accept Invite
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

export default function AcceptStaffInvitePage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Suspense fallback={<div className="text-center">Loading...</div>}>
                <AcceptInviteContent />
            </Suspense>
        </div>
    );
}
