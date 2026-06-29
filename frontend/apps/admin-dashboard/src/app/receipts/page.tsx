'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@shared/services/api';
import AdminLayout from '../../components/AdminLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@shared/components/ui/dialog';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Loader2, ZoomIn, ZoomOut, RotateCw, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

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

export default function ReceiptsAdmin() {
  const queryClient = useQueryClient();
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Lightbox visual transforms state
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Fetch pending receipts queue
  const { data: receipts, isLoading, error } = useQuery<Receipt[]>({
    queryKey: ['adminPendingReceipts'],
    queryFn: async () => {
      const response = await api.get('/admin/receipts/pending');
      return response.data as Receipt[];
    },
  });

  // Review (Approve/Reject) receipt mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason, key }: { id: string; status: 'approved' | 'rejected'; rejectionReason?: string; key: string }) => {
      return api.put(`/admin/receipts/${id}`, 
        { status, rejectionReason },
        { headers: { 'Idempotency-Key': key } }
      );
    },
    onSuccess: (data: any) => {
      const receipt = data.data as Receipt;
      toast.success(`Payment receipt successfully ${receipt.status === 'approved' ? 'approved & store activated' : 'rejected'}`);
      queryClient.invalidateQueries({ queryKey: ['adminPendingReceipts'] });
      setIsReviewOpen(false);
      setSelectedReceipt(null);
      setRejectionReason('');
      setZoom(1);
      setRotation(0);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to review payment receipt');
    }
  });

  const openReviewModal = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    const key = `receipt-review-${Math.random().toString(36).substring(2, 11)}-${Date.now()}`;
    setIdempotencyKey(key);
    setIsReviewOpen(true);
  };

  const handleReview = (status: 'approved' | 'rejected') => {
    if (!selectedReceipt) return;
    if (status === 'rejected' && !rejectionReason) {
      toast.error('Please specify a rejection reason');
      return;
    }
    reviewMutation.mutate({
      id: selectedReceipt._id,
      status,
      rejectionReason: status === 'rejected' ? rejectionReason : undefined,
      key: idempotencyKey
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Pending Receipts Queue</h2>
          <p className="text-sm text-slate-400 mt-1">Review uploaded manual Instapay or Vodaphone Cash transfer slips to activate stores.</p>
        </div>

        <Card className="border-white/5 bg-slate-900/60 backdrop-blur-md overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-20 text-center text-slate-400 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mr-2" />
                Loading receipts queue...
              </div>
            ) : error ? (
              <div className="py-20 text-center text-red-400">
                Failed to retrieve receipts queue.
              </div>
            ) : receipts?.length === 0 ? (
              <div className="py-20 text-center text-slate-500">
                No pending bank receipts in verification queue.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-950/40">
                  <TableRow className="border-white/5">
                    <TableHead className="text-slate-400">Merchant Info</TableHead>
                    <TableHead className="text-slate-400">Target Store</TableHead>
                    <TableHead className="text-slate-400">Subscription Plan</TableHead>
                    <TableHead className="text-slate-400">Payment Gateway</TableHead>
                    <TableHead className="text-slate-400">Upload Date</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts?.map((receipt) => (
                    <TableRow key={receipt._id} className="border-white/5 hover:bg-white/2 transition-colors">
                      <TableCell>
                        <div className="font-bold text-white text-sm">{receipt.merchantId?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{receipt.merchantId?.email || 'N/A'}</div>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-300">
                        {receipt.storeId?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-white/10 text-slate-300">
                          {receipt.planId?.name}
                        </Badge>
                        <div className="text-[10px] text-slate-500 mt-1">{receipt.planId?.price} EGP</div>
                      </TableCell>
                      <TableCell className="capitalize text-slate-300 font-medium">
                        {receipt.paymentMethod}
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">
                        {new Date(receipt.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm"
                          onClick={() => openReviewModal(receipt)}
                          className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl text-xs"
                        >
                          Review & Action
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Lightbox Review Modal */}
        <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
          <DialogContent className="bg-slate-900 border border-white/10 text-slate-100 max-w-4xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">Review Bank Receipt Verification</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Inspect screenshot and compare the transfer value details before approving subscription activation.
              </DialogDescription>
            </DialogHeader>

            {selectedReceipt && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2">
                {/* Details side */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Subscription details</h4>
                      <div className="grid grid-cols-2 gap-y-2 text-xs">
                        <div className="text-slate-400">Merchant Name:</div>
                        <div className="font-semibold text-white">{selectedReceipt.merchantId?.name}</div>
                        <div className="text-slate-400">Merchant Email:</div>
                        <div className="font-semibold text-white truncate">{selectedReceipt.merchantId?.email}</div>
                        <div className="text-slate-400">Store Name:</div>
                        <div className="font-semibold text-white">{selectedReceipt.storeId?.name}</div>
                        <div className="text-slate-400">Requested Plan:</div>
                        <div className="font-bold text-white text-cyan-400">{selectedReceipt.planId?.name}</div>
                        <div className="text-slate-400">Required Amount:</div>
                        <div className="font-black text-white">{selectedReceipt.planId?.price} EGP</div>
                        <div className="text-slate-400">Payment Gateway:</div>
                        <div className="font-semibold text-white capitalize">{selectedReceipt.paymentMethod}</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="rej-reason" className="text-slate-300 font-semibold text-xs">Rejection Reason (required if rejecting)</Label>
                      <Input 
                        id="rej-reason"
                        placeholder="e.g. Image blurry, incorrect amount sent"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="bg-slate-950 border border-white/10 text-white placeholder-slate-500"
                        disabled={reviewMutation.isPending}
                      />
                    </div>
                  </div>

                  {/* Idempotency key log */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-white/5 text-[10px] space-y-1 text-slate-500 font-mono">
                    <div><span className="text-cyan-400 font-bold uppercase">Idempotency Key:</span> {idempotencyKey}</div>
                    <div className="text-slate-600">Prevents dual approvals or race conditions.</div>
                  </div>
                </div>

                {/* Lightbox Image Visualizers */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-slate-950/60 p-2 border border-white/5 rounded-xl text-slate-400 text-xs">
                    <span className="font-semibold">Receipt screenshot</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
                        className="p-1 hover:text-white hover:bg-white/5 rounded"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
                        className="p-1 hover:text-white hover:bg-white/5 rounded"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setRotation(prev => (prev + 90) % 360)}
                        className="p-1 hover:text-white hover:bg-white/5 rounded"
                        title="Rotate"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Lightbox frame */}
                  <div className="relative overflow-hidden bg-slate-950 rounded-xl aspect-[4/3] flex items-center justify-center border border-white/10 shadow-inner">
                    <div 
                      className="transition-transform duration-200 ease-out max-w-full max-h-full"
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      }}
                    >
                      <img 
                        src={selectedReceipt.receiptImage} 
                        alt="Receipt slip" 
                        className="object-contain max-h-[300px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2 gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsReviewOpen(false)}
                className="border-white/10 text-slate-300 rounded-xl"
                disabled={reviewMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="destructive"
                onClick={() => handleReview('rejected')}
                className="rounded-xl px-5"
                disabled={reviewMutation.isPending || !rejectionReason}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Reject Receipt
              </Button>
              <Button 
                type="button" 
                onClick={() => handleReview('approved')}
                className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl px-5"
                disabled={reviewMutation.isPending}
              >
                {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1.5" />}
                Approve & Activate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
