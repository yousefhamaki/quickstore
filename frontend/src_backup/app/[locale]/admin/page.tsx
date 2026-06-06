'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogOut } from 'lucide-react';

interface Receipt {
    _id: string;
    merchantId: { _id: string; name: string; email: string };
    storeId: { _id: string; name: string };
    planId: { _id: string; name: string; price: number };
    receiptImage: string;
    paymentMethod: string;
    status: string;
    createdAt: string;
}

export default function AdminDashboard() {
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const { user, logout } = useAuth();

    useEffect(() => {
        fetchReceipts();
    }, []);

    const fetchReceipts = async () => {
        try {
            const response = await api.get('/admin/receipts/pending');
            setReceipts(response.data as Receipt[]);
        } catch (err) {
            console.error('Failed to fetch receipts', err);
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (status: 'approved' | 'rejected') => {
        if (!selectedReceipt) return;

        try {
            await api.put(`/admin/receipts/${selectedReceipt._id}`, {
                status,
                rejectionReason: status === 'rejected' ? rejectionReason : undefined,
            });
            setIsReviewOpen(false);
            setSelectedReceipt(null);
            setRejectionReason('');
            fetchReceipts();
        } catch (err) {
            console.error('Failed to review receipt', err);
        }
    };

    if (user?.role !== 'super_admin') {
        return <div className="p-8 text-center">Unauthorized access. Super Admin only.</div>;
    }

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Admin Dashboard</h1>
                <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-md px-3 py-1">Super Admin</Badge>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                            if (confirm('Are you sure you want to logout?')) {
                                logout();
                            }
                        }}
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            <Card className="border-0 shadow-xl overflow-hidden glass">
                <CardHeader className="bg-white/50 border-b">
                    <CardTitle>Pending Subscription Requests</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead>Merchant</TableHead>
                                <TableHead>Store</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-10">Loading...</TableCell></TableRow>
                            ) : receipts.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-500">No pending requests found</TableCell></TableRow>
                            ) : (
                                receipts.map((receipt) => (
                                    <TableRow key={receipt._id} className="hover:bg-blue-50/30 transition-colors">
                                        <TableCell className="font-medium">
                                            <div>{receipt.merchantId.name}</div>
                                            <div className="text-xs text-gray-500">{receipt.merchantId.email}</div>
                                        </TableCell>
                                        <TableCell>{receipt.storeId.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{receipt.planId.name}</Badge>
                                            <div className="text-xs mt-1">{receipt.planId.price} EGP</div>
                                        </TableCell>
                                        <TableCell className="capitalize">{receipt.paymentMethod}</TableCell>
                                        <TableCell>{new Date(receipt.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="default"
                                                className="bg-blue-600 hover:bg-blue-700"
                                                onClick={() => {
                                                    setSelectedReceipt(receipt);
                                                    setIsReviewOpen(true);
                                                }}
                                            >
                                                Review
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-t-4 border-blue-600">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Review Subscription Payment</DialogTitle>
                        <DialogDescription>
                            Carefully verify the transaction screenshot before approving.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedReceipt && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                    <h3 className="font-semibold text-sm uppercase text-gray-500 mb-2">Details</h3>
                                    <div className="space-y-2">
                                        <p><span className="font-medium">Merchant:</span> {selectedReceipt.merchantId.name}</p>
                                        <p><span className="font-medium">Plan:</span> {selectedReceipt.planId.name} ({selectedReceipt.planId.price} EGP)</p>
                                        <p><span className="font-medium">Method:</span> <span className="capitalize">{selectedReceipt.paymentMethod}</span></p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="rejection-reason" className="text-sm font-semibold">Rejection Reason (if rejecting)</Label>
                                    <Input
                                        id="rejection-reason"
                                        placeholder="e.g. Invalid screenshot, incorrect amount"
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        className="border-gray-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold uppercase text-gray-500">Payment Receipt Image</Label>
                                <div className="rounded-xl overflow-hidden border-2 border-gray-100 shadow-inner bg-gray-100 aspect-[3/4] flex items-center justify-center">
                                    <img src={selectedReceipt.receiptImage} alt="Receipt" className="max-w-full max-h-full object-contain" />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsReviewOpen(false)} className="rounded-full px-6">Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => handleReview('rejected')}
                            disabled={!rejectionReason}
                            className="rounded-full px-6"
                        >
                            Reject Payment
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 rounded-full px-6"
                            onClick={() => handleReview('approved')}
                        >
                            Approve & Activate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
