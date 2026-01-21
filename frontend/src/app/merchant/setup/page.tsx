'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function StoreSetupPage() {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/merchants/store', { name, slug });
            router.push('/merchant/subscribe');
        } catch (err: any) {
            if (err.response?.status === 403 && err.response?.data?.message?.includes('verify your email')) {
                router.push('/auth/verification-required');
                return;
            }
            setError(err.response?.data?.message || 'Failed to setup store');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <Card className="w-full max-w-lg shadow-2xl border-0 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-3xl font-bold">Setup Your Store</CardTitle>
                    <CardDescription>
                        Give your store a name and a unique web address
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="store-name" className="text-sm font-semibold">Store Name</Label>
                            <Input
                                id="store-name"
                                placeholder="My Awesome Shop"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (!slug) {
                                        setSlug(e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''));
                                    }
                                }}
                                required
                                className="h-12 text-lg"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="store-slug" className="text-sm font-semibold">Store Subdomain / Path</Label>
                            <div className="flex items-center border rounded-md px-3 bg-gray-50 group focus-within:ring-2 focus-within:ring-blue-500">
                                <span className="text-gray-400 group-focus-within:text-blue-500 font-medium">quickstore.com/</span>
                                <input
                                    id="store-slug"
                                    placeholder="shop-name"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/ /g, '-'))}
                                    required
                                    className="w-full h-12 bg-transparent border-none focus:ring-0 text-lg font-medium outline-none ml-1"
                                />
                            </div>
                            <p className="text-xs text-gray-500">Your customers will visit this URL to buy your products.</p>
                        </div>
                        {error && <p className="text-sm text-red-500 text-center font-medium bg-red-50 p-2 rounded-md">{error}</p>}
                        <Button
                            type="submit"
                            className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                            disabled={loading}
                        >
                            {loading ? 'Creating Store...' : 'Initialize Store'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
