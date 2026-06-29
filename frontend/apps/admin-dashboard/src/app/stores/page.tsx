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
import { Loader2, Search, ExternalLink, Calendar, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface Store {
  _id: string;
  name: string;
  slug: string;
  status: 'draft' | 'live' | 'paused';
  category?: string;
  ownerId: {
    _id: string;
    name: string;
    email: string;
  };
  domain: {
    type: 'subdomain' | 'custom';
    subdomain: string;
    customDomain?: string;
    isVerified: boolean;
  };
  stats: {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
  };
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  expiryDate?: string;
  createdAt: string;
}

interface Plan {
  _id: string;
  name: string;
  price: number;
}

export default function StoresAdmin() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection states for modal triggers
  const [overrideStore, setOverrideStore] = useState<Store | null>(null);
  const [overridePlanId, setOverridePlanId] = useState('');
  const [overrideDuration, setOverrideDuration] = useState('30');
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);

  const [statusStore, setStatusStore] = useState<Store | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // Fetch stores list
  const { data: stores, isLoading, error } = useQuery<Store[]>({
    queryKey: ['adminStores'],
    queryFn: async () => {
      const response = await api.get('/admin/stores');
      return response.data as Store[];
    },
  });

  // Fetch active pricing plans for subscription override select
  const { data: plans } = useQuery<Plan[]>({
    queryKey: ['adminPlansList'],
    queryFn: async () => {
      const response = await api.get('/admin/plans');
      return response.data as Plan[];
    },
  });

  // Subscription override mutation
  const overrideMutation = useMutation({
    mutationFn: async ({ id, planId, durationDays, reason }: { id: string; planId: string; durationDays: number; reason: string }) => {
      return api.put(`/admin/stores/${id}/subscription`, { planId, durationDays, reason });
    },
    onSuccess: () => {
      toast.success('Store subscription overridden successfully');
      queryClient.invalidateQueries({ queryKey: ['adminStores'] });
      setIsOverrideOpen(false);
      setOverrideStore(null);
      setOverridePlanId('');
      setOverrideReason('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to override store subscription');
    }
  });

  // Toggle store status (suspend/paused) mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: 'draft' | 'live' | 'paused'; reason: string }) => {
      return api.put(`/admin/stores/${id}/status`, { status, reason });
    },
    onSuccess: () => {
      toast.success('Store status modified successfully');
      queryClient.invalidateQueries({ queryKey: ['adminStores'] });
      setIsStatusOpen(false);
      setStatusStore(null);
      setStatusReason('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to modify store status');
    }
  });

  const openOverrideModal = (store: Store) => {
    setOverrideStore(store);
    setOverridePlanId(store.subscriptionPlan || (plans && plans[0]?._id) || '');
    setIsOverrideOpen(true);
  };

  const handleOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideStore || !overridePlanId || !overrideDuration || !overrideReason) {
      toast.error('Please fill in all required fields');
      return;
    }
    const daysNum = parseInt(overrideDuration, 10);
    if (isNaN(daysNum) || daysNum <= 0) {
      toast.error('Duration must be a positive integer');
      return;
    }
    overrideMutation.mutate({
      id: overrideStore._id,
      planId: overridePlanId,
      durationDays: daysNum,
      reason: overrideReason
    });
  };

  const openStatusModal = (store: Store) => {
    setStatusStore(store);
    setIsStatusOpen(true);
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusStore || !statusReason) {
      toast.error('Please specify a reason');
      return;
    }
    const targetStatus = statusStore.status === 'paused' ? 'live' : 'paused';
    statusMutation.mutate({
      id: statusStore._id,
      status: targetStatus,
      reason: statusReason
    });
  };

  // Filter stores list based on search term
  const filteredStores = stores?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.slug.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.domain.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Hosted Stores</h2>
            <p className="text-sm text-slate-400 mt-1">Monitor active subdomains, products stats, and modify subscription plans.</p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 w-full md:w-80 text-slate-400">
            <Search className="w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search stores..." 
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
                Loading hosted stores...
              </div>
            ) : error ? (
              <div className="py-20 text-center text-red-400">
                Failed to retrieve hosted stores.
              </div>
            ) : filteredStores.length === 0 ? (
              <div className="py-20 text-center text-slate-500">
                No stores found matching your query.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-950/40">
                  <TableRow className="border-white/5">
                    <TableHead className="text-slate-400">Store Info</TableHead>
                    <TableHead className="text-slate-400">Owner Merchant</TableHead>
                    <TableHead className="text-slate-400">Domain URL</TableHead>
                    <TableHead className="text-slate-400">Products & Orders</TableHead>
                    <TableHead className="text-slate-400">Active Plan</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStores.map((store) => {
                    const domainUrl = store.domain.type === 'custom' && store.domain.customDomain 
                      ? `https://${store.domain.customDomain}` 
                      : `https://${store.domain.subdomain}.quickstore.live`;
                    return (
                      <TableRow key={store._id} className="border-white/5 hover:bg-white/2 transition-colors">
                        <TableCell>
                          <div className="font-bold text-white text-sm">{store.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5 capitalize">Category: {store.category || 'General'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-semibold text-slate-300">{store.ownerId?.name || 'Unknown'}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{store.ownerId?.email || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <a 
                            href={domainUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold hover:underline"
                          >
                            {store.domain.subdomain}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <div className="text-[9px] text-slate-500 mt-1 capitalize">Type: {store.domain.type}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-slate-300">Products: <strong className="text-white">{store.stats?.totalProducts || 0}</strong></div>
                          <div className="text-xs text-slate-300 mt-0.5">Orders: <strong className="text-white">{store.stats?.totalOrders || 0}</strong></div>
                        </TableCell>
                        <TableCell>
                          {store.subscriptionPlan ? (
                            <>
                              <Badge variant="outline" className="border-white/10 text-slate-300">
                                {plans?.find(p => p._id === store.subscriptionPlan)?.name || 'Custom Plan'}
                              </Badge>
                              {store.expiryDate && (
                                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-600" />
                                  Exp: {new Date(store.expiryDate).toLocaleDateString()}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-slate-500">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              store.status === 'live' 
                                ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                : store.status === 'paused'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            }
                          >
                            {store.status === 'paused' ? 'Suspended' : store.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => openOverrideModal(store)}
                              className="bg-slate-800 hover:bg-slate-700 text-xs rounded-xl"
                            >
                              Plan Override
                            </Button>
                            <Button 
                              size="sm"
                              variant={store.status === 'paused' ? 'default' : 'destructive'}
                              onClick={() => openStatusModal(store)}
                              className={`text-xs rounded-xl ${store.status === 'paused' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-950/40 text-red-400 border border-red-500/20 hover:bg-red-900/30'}`}
                            >
                              {store.status === 'paused' ? 'Unsuspend' : 'Suspend'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Subscription Plan Override Dialog */}
        <Dialog open={isOverrideOpen} onOpenChange={setIsOverrideOpen}>
          <DialogContent className="bg-slate-900 border border-white/10 text-slate-100 max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">Override Subscription Plan</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Manually allocate a subscription plan and extension length to: <strong className="text-cyan-400">{overrideStore?.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleOverrideSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ov-plan" className="text-slate-300 font-semibold text-xs">Select Plan</Label>
                  <select 
                    id="ov-plan"
                    value={overridePlanId}
                    onChange={(e) => setOverridePlanId(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="" disabled>Choose plan</option>
                    {plans?.map(p => (
                      <option key={p._id} value={p._id}>{p.name} ({p.price} EGP)</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ov-duration" className="text-slate-300 font-semibold text-xs">Duration (Days)</Label>
                  <Input 
                    id="ov-duration"
                    type="number"
                    value={overrideDuration}
                    onChange={(e) => setOverrideDuration(e.target.value)}
                    className="bg-slate-950 border border-white/10 text-white placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ov-reason" className="text-slate-300 font-semibold text-xs">Override Reason</Label>
                <Input 
                  id="ov-reason"
                  placeholder="e.g. VIP client promo, manual billing reconciliation"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="bg-slate-950 border border-white/10 text-white placeholder-slate-500"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOverrideOpen(false)}
                  className="border-white/10 text-slate-300 rounded-xl"
                  disabled={overrideMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl"
                  disabled={overrideMutation.isPending}
                >
                  {overrideMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Confirm Override
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Store Suspension Status Dialog */}
        <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
          <DialogContent className="bg-slate-900 border border-white/10 text-slate-100 max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldAlert className="text-red-500 w-6 h-6" />
                Confirm Store Suspension Alteration
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Are you sure you want to {statusStore?.status === 'paused' ? 'UNSUSPEND' : 'SUSPEND'} store <strong className="text-red-400">{statusStore?.name}</strong>?
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleStatusSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="susp-reason" className="text-slate-300 font-semibold text-xs">Specify Reason</Label>
                <Input 
                  id="susp-reason"
                  placeholder="e.g. Illegal dropshipping inventory listed"
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
                  className={statusStore?.status === 'paused' ? 'bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl' : 'bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl'}
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
