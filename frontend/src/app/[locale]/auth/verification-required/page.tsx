'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, ArrowRight } from 'lucide-react';

export default function VerificationRequiredPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 backdrop-blur-xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                            <Mail className="w-8 h-8" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">Email Verification Required</CardTitle>
                    <CardDescription className="text-lg mt-2">
                        We noticed your email address hasn't been verified yet.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-gray-600">
                        To ensure the security of your store and prevent spam, we require all merchants to verify their email address before creating a store.
                    </p>
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-sm text-amber-800">
                        Please check your inbox (and spam folder) for the verification link we sent you.
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Link href="/auth/login" className="w-full">
                        <Button variant="outline" className="w-full">
                            Back to Login
                        </Button>
                    </Link>
                    <p className="text-xs text-gray-400 mt-2">
                        Verified? <Link href="/auth/login" className="text-blue-600 hover:underline">Log in again to refresh status</Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
