'use client';

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Input } from "@shared/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { Textarea } from "@shared/components/ui/textarea";
import { HandCoins, Check, X, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
    getRefundRequests,
    approveRefundRequest,
    rejectRefundRequest,
    MerchantRefundRequest
} from "@shared/services/refundRequestService";

const TABS = ['pending', 'approved', 'rejected'] as const;

export default function RefundRequestsPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const [tab, setTab] = useState<typeof TABS[number]>('pending');
    const [requests, setRequests] = useState<MerchantRefundRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);

    const [approveDialogId, setApproveDialogId] = useState<string | null>(null);
    const [approveAmount, setApproveAmount] = useState('');
    const [approveNote, setApproveNote] = useState('');

    const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
    const [rejectNote, setRejectNote] = useState('');

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await getRefundRequests(storeId, tab);
            setRequests(data);
        } catch (error) {
            toast.error('Failed to load refund requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [storeId, tab]);

    const openApproveDialog = (req: MerchantRefundRequest) => {
        setApproveDialogId(req._id);
        setApproveAmount(String(req.requestedAmount));
        setApproveNote('');
    };

    const handleApprove = async () => {
        if (!approveDialogId) return;
        const amount = Number(approveAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error('Enter a valid amount');
            return;
        }
        try {
            setBusyId(approveDialogId);
            await approveRefundRequest(approveDialogId, amount, approveNote.trim() || undefined);
            toast.success('Refund request approved');
            setApproveDialogId(null);
            fetchRequests();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to approve request');
        } finally {
            setBusyId(null);
        }
    };

    const handleReject = async () => {
        if (!rejectDialogId || !rejectNote.trim()) {
            toast.error('A note is required to reject a request');
            return;
        }
        try {
            setBusyId(rejectDialogId);
            await rejectRefundRequest(rejectDialogId, rejectNote.trim());
            toast.success('Refund request rejected');
            setRejectDialogId(null);
            fetchRequests();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to reject request');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <HandCoins className="w-7 h-7 text-primary" /> Refund Requests
                </h1>
                <p className="text-muted-foreground text-sm">
                    Customer-initiated refund asks. Approving one adjusts the final amount if needed and applies the same refund engine as a direct refund.
                </p>
            </div>

            <div className="flex gap-2">
                {TABS.map((t) => (
                    <Button
                        key={t}
                        variant={tab === t ? 'default' : 'outline'}
                        size="sm"
                        className="rounded-xl capitalize"
                        onClick={() => setTab(t)}
                    >
                        {t}
                    </Button>
                ))}
            </div>

            <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-16 space-y-2">
                            <HandCoins className="w-10 h-10 text-muted-foreground mx-auto" />
                            <p className="font-bold">No {tab} refund requests</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {requests.map((req) => (
                                <div key={req._id} className="p-5 space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Link
                                                    href={`/dashboard/stores/${storeId}/orders/${req.orderId._id}`}
                                                    className="font-bold text-sm hover:underline"
                                                >
                                                    {req.orderId.orderNumber}
                                                </Link>
                                                <Badge variant="outline" className="text-xs">
                                                    {[req.customerId?.firstName, req.customerId?.lastName].filter(Boolean).join(' ') || req.customerId?.email}
                                                </Badge>
                                            </div>
                                            <p className="text-sm font-black mt-1">EGP {req.requestedAmount.toLocaleString()} requested</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground shrink-0">
                                            {new Date(req.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{req.reason}</p>
                                    {req.photoUrl && (
                                        <a href={req.photoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                                            <ImageIcon className="w-3.5 h-3.5" /> View attached photo
                                        </a>
                                    )}
                                    {req.status !== 'pending' && (
                                        <div className="ml-4 pl-4 border-l-2 space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                {req.status === 'approved' ? `Approved — EGP ${req.finalAmount?.toLocaleString()}` : 'Rejected'}
                                            </p>
                                            {req.merchantResponseNote && <p className="text-sm">{req.merchantResponseNote}</p>}
                                        </div>
                                    )}
                                    {tab === 'pending' && (
                                        <div className="flex items-center gap-2 pt-1">
                                            <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700" disabled={busyId === req._id} onClick={() => openApproveDialog(req)}>
                                                <Check className="w-3.5 h-3.5 mr-1" /> Approve
                                            </Button>
                                            <Button size="sm" variant="outline" className="rounded-xl" disabled={busyId === req._id} onClick={() => { setRejectDialogId(req._id); setRejectNote(''); }}>
                                                <X className="w-3.5 h-3.5 mr-1" /> Reject
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Approve Dialog */}
            <Dialog open={!!approveDialogId} onOpenChange={(open) => !open && setApproveDialogId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Refund Request</DialogTitle>
                        <DialogDescription>Adjust the amount if needed — this is what actually gets refunded, not necessarily what the customer asked for.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={approveAmount}
                            onChange={(e) => setApproveAmount(e.target.value)}
                            placeholder="Amount to refund (EGP)"
                            className="rounded-xl border-2"
                        />
                        <Textarea
                            value={approveNote}
                            onChange={(e) => setApproveNote(e.target.value)}
                            placeholder="Optional note shown to the customer"
                            className="rounded-xl border-2 min-h-[80px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl" onClick={() => setApproveDialogId(null)}>Cancel</Button>
                        <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700" disabled={busyId === approveDialogId} onClick={handleApprove}>
                            {busyId === approveDialogId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Confirm Approval
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={!!rejectDialogId} onOpenChange={(open) => !open && setRejectDialogId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Refund Request</DialogTitle>
                        <DialogDescription>Let the customer know why — this note is shown to them.</DialogDescription>
                    </DialogHeader>
                    <Textarea
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Why is this request being rejected?"
                        className="rounded-xl border-2 min-h-[100px]"
                    />
                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl" onClick={() => setRejectDialogId(null)}>Cancel</Button>
                        <Button variant="destructive" className="rounded-xl" disabled={!rejectNote.trim() || busyId === rejectDialogId} onClick={handleReject}>
                            {busyId === rejectDialogId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
