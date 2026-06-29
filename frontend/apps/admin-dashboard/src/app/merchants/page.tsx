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
import { Loader2, Search, AlertTriangle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface Merchant {
  _id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  isBlocked: boolean;
  subscriptionStatus: string;
  subscriptionPlan?: {
    name: string;
    price: number;
  };
  stores: Array<{ _id: string; name: string; slug: string }>;
  walletBalance: number;
  createdAt: string;
}

export default function MerchantsAdmin() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection states for actions
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletType, setWalletType] = useState<'credit' | 'debit'>('credit');
  const [walletReason, setWalletReason] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  const [statusMerchant, setStatusMerchant] = useState<Merchant | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // Fetch merchants list
  const { data: merchants, isLoading, error } = useQuery<Merchant[]>({
    queryKey: ['adminMerchants'],
    queryFn: async () => {
      const response = await api.get('/admin/merchants');
      return response.data as Merchant[];
    },
  });

  // Wallet adjustment mutation
  const walletMutation = useMutation({
    mutationFn: async ({ id, amount, type, reason, key }: { id: string; amount: number; type: 'credit' | 'debit'; reason: string; key: string }) => {
      return api.post(`/admin/merchants/${id}/wallet/adjust`, 
        { amount, type, reason },
        { headers: { 'Idempotency-Key': key } }
      );
    },
    onSuccess: () => {
      toast.success('Wallet balance adjusted successfully');
      queryClient.invalidateQueries({ queryKey: ['adminMerchants'] });
      setIsWalletOpen(false);
      setSelectedMerchant(null);
      setWalletAmount('');
      setWalletReason('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to adjust wallet balance');
    }
  });

  // Block/Unblock status toggle mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, isBlocked, reason }: { id: string; isBlocked: boolean; reason: string }) => {
      return api.put(`/admin/merchants/${id}/status`, { isBlocked, reason });
    },
    onSuccess: (data: any) => {
      const merchant = data.data as Merchant;
      toast.success(`Merchant successfully ${merchant.isBlocked ? 'blocked' : 'unblocked'}`);
      queryClient.invalidateQueries({ queryKey: ['adminMerchants'] });
      setIsStatusOpen(false);
      setStatusMerchant(null);
      setStatusReason('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to toggle merchant status');
    }
  });

  const openWalletModal = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    // Generate fresh idempotency key
    const key = `idem-${Math.random().toString(36).substring(2, 11)}-${Date.now()}`;
    setIdempotencyKey(key);
    setIsWalletOpen(true);
  };

  const handleWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchant || !walletAmount || !walletReason) {
      toast.error('Please fill in all required fields');
      return;
    }
    const amountNum = parseFloat(walletAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Amount must be a positive number');
      return;
    }

    walletMutation.mutate({
      id: selectedMerchant._id,
      amount: amountNum,
      type: walletType,
      reason: walletReason,
      key: idempotencyKey
    });
  };

  const openStatusModal = (merchant: Merchant) => {
    setStatusMerchant(merchant);
    setIsStatusOpen(true);
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusMerchant || !statusReason) {
      toast.error('Please specify a reason');
      return;
    }
    statusMutation.mutate({
      id: statusMerchant._id,
      isBlocked: !statusMerchant.isBlocked,
      reason: statusReason
    });
  };

  // Filter merchants based on search query
  const filteredMerchants = merchants?.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Merchant Accounts</h2>
            <p className="text-sm text-slate-400 mt-1">Manage tenant subscriptions, wallet ledgers, and credentials access.</p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 w-full md:w-80 text-slate-400">
            <Search className="w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search merchants..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-sm text-white placeholder-slate-500 focus:outline-none w-full"
            />
          </div>
        </div>

        <Card className="border-white/5 bg-slate-900/60 backdrop-blur-md overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-20 text-center text-slate-400 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mr-2" />
                Loading merchant accounts...
              </div>
            ) : error ? (
              <div className="py-20 text-center text-red-400">
                Failed to retrieve merchants list.
              </div>
            ) : filteredMerchants.length === 0 ? (
              <div className="py-20 text-center text-slate-500">
                No merchant accounts found matching your query.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-950/40">
                  <TableRow className="border-white/5">
                    <TableHead className="text-slate-400">Merchant Info</TableHead>
                    <TableHead className="text-slate-400">Verification</TableHead>
                    <TableHead className="text-slate-400">Active Plan</TableHead>
                    <TableHead className="text-slate-400 text-right">Wallet Balance</TableHead>
                    <TableHead className="text-slate-400">Stores Hosted</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMerchants.map((merchant) => (
                    <TableRow key={merchant._id} className="border-white/5 hover:bg-white/2 transition-colors">
                      <TableCell>
                        <div className="font-bold text-white text-sm">{merchant.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{merchant.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={merchant.isVerified ? 'default' : 'secondary'}
                          className={merchant.isVerified ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}
                        >
                          {merchant.isVerified ? 'Verified' : 'Unverified'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-white/10 text-slate-300">
                          {merchant.subscriptionPlan?.name || 'Free Plan'}
                        </Badge>
                        <div className="text-[10px] text-slate-500 mt-1 capitalize">Status: {merchant.subscriptionStatus}</div>
                      </TableCell>
                      <TableCell className="text-right font-black text-white">
                        {(merchant.walletBalance || 0).toLocaleString()} EGP
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-white">{merchant.stores?.length || 0} stores</span>
                          <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                            {merchant.stores?.map(s => s.name).join(', ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={merchant.isBlocked ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}
                        >
                          {merchant.isBlocked ? 'Blocked' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => openWalletModal(merchant)}
                            className="bg-slate-800 hover:bg-slate-700 text-xs rounded-xl"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Adjust Wallet
                          </Button>
                          <Button 
                            size="sm"
                            variant={merchant.isBlocked ? 'default' : 'destructive'}
                            onClick={() => openStatusModal(merchant)}
                            className={`text-xs rounded-xl ${merchant.isBlocked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-950/40 text-red-400 border border-red-500/20 hover:bg-red-900/30'}`}
                          >
                            {merchant.isBlocked ? 'Unblock' : 'Block'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Wallet Adjustment Dialog */}
        <Dialog open={isWalletOpen} onOpenChange={setIsWalletOpen}>
          <DialogContent className="bg-slate-900 border border-white/10 text-slate-100 max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">Adjust Wallet Balance</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Manually credit or debit funds to merchant wallet: <strong className="text-cyan-400">{selectedMerchant?.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleWalletSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="adj-type" className="text-slate-300 font-semibold text-xs">Action Type</Label>
                  <select 
                    id="adj-type"
                    value={walletType}
                    onChange={(e) => setWalletType(e.target.value as 'credit' | 'debit')}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="credit">Credit (Add Funds)</option>
                    <option value="debit">Debit (Deduct Funds)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adj-amount" className="text-slate-300 font-semibold text-xs">Amount (EGP)</Label>
                  <Input 
                    id="adj-amount"
                    type="number"
                    step="0.01"
                    placeholder="150.00"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    className="bg-slate-950 border border-white/10 text-white placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adj-reason" className="text-slate-300 font-semibold text-xs">Adjustment Reason</Label>
                <Input 
                  id="adj-reason"
                  placeholder="e.g. Manual correction, promotional balance grant"
                  value={walletReason}
                  onChange={(e) => setWalletReason(e.target.value)}
                  className="bg-slate-950 border border-white/10 text-white placeholder-slate-500"
                />
              </div>

              {/* Idempotency indicators */}
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5 text-[10px] space-y-1 text-slate-500 font-mono">
                <div><span className="text-cyan-400 font-bold uppercase">Idempotency Key:</span> {idempotencyKey}</div>
                <div className="text-slate-600">Guarantees execution exactly once even on connection lag.</div>
              </div>

              <DialogFooter className="pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsWalletOpen(false)}
                  className="border-white/10 text-slate-300 rounded-xl"
                  disabled={walletMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl"
                  disabled={walletMutation.isPending}
                >
                  {walletMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Confirm Adjustment
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Block Status Toggle Dialog */}
        <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
          <DialogContent className="bg-slate-900 border border-white/10 text-slate-100 max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <AlertTriangle className="text-red-500 w-6 h-6" />
                Confirm Status Modification
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Are you sure you want to {statusMerchant?.isBlocked ? 'UNBLOCK' : 'BLOCK'} merchant <strong className="text-red-400">{statusMerchant?.name}</strong>?
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleStatusSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="status-reason" className="text-slate-300 font-semibold text-xs">Reason for action</Label>
                <Input 
                  id="status-reason"
                  placeholder="e.g. Violation of platform EULA"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="bg-slate-950 border border-white/10 text-white placeholder-slate-500"
                />
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsStatusOpen(false)}
                  className="border-white/10 text-slate-300 rounded-xl"
                  disabled={statusMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className={statusMerchant?.isBlocked ? 'bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl' : 'bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl'}
                  disabled={statusMutation.isPending}
                >
                  {statusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Confirm
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
