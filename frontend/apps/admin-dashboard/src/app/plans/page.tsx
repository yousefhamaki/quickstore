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
import { Loader2, Plus, Edit3, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  _id: string;
  name: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  price: number;
  currency: string;
  emailLimit?: number;
  maxStores: number;
  productLimit: number;
  orderFee: number;
  isActive: boolean;
  type: 'free' | 'paid';
  features_en: string[];
  features_ar: string[];
  features?: {
    dropshipping: boolean;
    customDomain: boolean;
    allowUCD: boolean;
  };
}

export default function PlansAdmin() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form states
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [price, setPrice] = useState('');
  const [emailLimit, setEmailLimit] = useState('');
  const [maxStores, setMaxStores] = useState('1');
  const [productLimit, setProductLimit] = useState('-1');
  const [orderFee, setOrderFee] = useState('0');
  const [planType, setPlanType] = useState<'free' | 'paid'>('paid');
  const [dropshipping, setDropshipping] = useState(false);
  const [customDomain, setCustomDomain] = useState(false);
  const [allowUCD, setAllowUCD] = useState(false);
  const [editReason, setEditReason] = useState('');

  // Fetch plans
  const { data: plans, isLoading, error } = useQuery<Plan[]>({
    queryKey: ['adminPlans'],
    queryFn: async () => {
      const response = await api.get('/admin/plans');
      return response.data as Plan[];
    },
  });

  // Create plan mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/admin/plans', data);
    },
    onSuccess: () => {
      toast.success('Subscription plan created successfully');
      queryClient.invalidateQueries({ queryKey: ['adminPlans'] });
      closeForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create pricing plan');
    }
  });

  // Update plan mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return api.put(`/admin/plans/${id}`, data);
    },
    onSuccess: () => {
      toast.success('Subscription plan updated successfully');
      queryClient.invalidateQueries({ queryKey: ['adminPlans'] });
      closeForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update pricing plan');
    }
  });

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedPlan(null);
    setNameEn('');
    setNameAr('');
    setDescEn('');
    setDescAr('');
    setPrice('');
    setEmailLimit('');
    setMaxStores('1');
    setProductLimit('-1');
    setOrderFee('0');
    setPlanType('paid');
    setDropshipping(false);
    setCustomDomain(false);
    setAllowUCD(false);
    setEditReason('');
    setIsFormOpen(true);
  };

  const openEditModal = (plan: Plan) => {
    setIsEditMode(true);
    setSelectedPlan(plan);
    setNameEn(plan.name_en || plan.name || '');
    setNameAr(plan.name_ar || '');
    setDescEn(plan.description_en || '');
    setDescAr(plan.description_ar || '');
    setPrice(String(plan.price || 0));
    setEmailLimit(String(plan.emailLimit || 0));
    setMaxStores(String(plan.maxStores || 1));
    setProductLimit(String(plan.productLimit || -1));
    setOrderFee(String(plan.orderFee || 0));
    setPlanType(plan.type || 'paid');
    setDropshipping(plan.features?.dropshipping || false);
    setCustomDomain(plan.features?.customDomain || false);
    setAllowUCD(plan.features?.allowUCD || false);
    setEditReason('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedPlan(null);
    setEditReason('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn || !descEn || !maxStores || !productLimit) {
      toast.error('Please fill in all mandatory fields');
      return;
    }
    if (isEditMode && !editReason) {
      toast.error('Audit reason is required for updates');
      return;
    }

    // Build features lists based on toggles
    const listEn: string[] = [];
    const listAr: string[] = [];

    if (customDomain) {
      listEn.push('Custom Domain Support');
      listAr.push('دعم النطاق الخاص');
    }
    if (dropshipping) {
      listEn.push('Catalog Dropshipping Access');
      listAr.push('الوصول لكتالوج الدروب شيبنج');
    }
    if (allowUCD) {
      listEn.push('Upsell & Cross-sell campaigns gate');
      listAr.push('بوابة حملات زيادة المبيعات');
    }
    listEn.push(`Monthly allowance: ${emailLimit || '0'} campaigns email credits`);
    listAr.push(`الحد الشهري: ${emailLimit || '0'} رصيد حملات بريد إلكتروني`);

    const payload = {
      name: nameEn,
      name_en: nameEn,
      name_ar: nameAr,
      description_en: descEn,
      description_ar: descAr,
      price: planType === 'free' ? 0 : parseFloat(price),
      monthlyPrice: planType === 'free' ? 0 : parseFloat(price),
      type: planType,
      emailLimit: parseInt(emailLimit, 10) || 0,
      maxStores: parseInt(maxStores, 10) || 1,
      storeLimit: parseInt(maxStores, 10) || 1,
      productLimit: parseInt(productLimit, 10) || -1,
      orderFee: parseFloat(orderFee) || 0,
      features_en: listEn,
      features_ar: listAr,
      features: {
        dropshipping,
        customDomain,
        allowUCD
      },
      reason: editReason
    };

    if (isEditMode && selectedPlan) {
      updateMutation.mutate({ id: selectedPlan._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">SaaS Subscription Plans</h2>
            <p className="text-sm text-slate-400 mt-1">Configure pricing tiers, limit allowances, features checklists, and fees.</p>
          </div>

          <Button 
            onClick={openCreateModal}
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl"
          >
            <Plus className="w-5 h-5 mr-1" />
            Create Plan
          </Button>
        </div>

        <Card className="border-white/5 bg-slate-900/60 backdrop-blur-md overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-20 text-center text-slate-400 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mr-2" />
                Loading pricing plans...
              </div>
            ) : error ? (
              <div className="py-20 text-center text-red-400">
                Failed to retrieve pricing plans.
              </div>
            ) : plans?.length === 0 ? (
              <div className="py-20 text-center text-slate-500">
                No subscription plans active.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-950/40">
                  <TableRow className="border-white/5">
                    <TableHead className="text-slate-400">Plan Tier</TableHead>
                    <TableHead className="text-slate-400">Monthly Price</TableHead>
                    <TableHead className="text-slate-400">Store Cap</TableHead>
                    <TableHead className="text-slate-400">Products Cap</TableHead>
                    <TableHead className="text-slate-400">Email Marketing Credits</TableHead>
                    <TableHead className="text-slate-400">Platform Tx Fee (EGP)</TableHead>
                    <TableHead className="text-slate-400">State</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans?.map((plan) => (
                    <TableRow key={plan._id} className="border-white/5 hover:bg-white/2 transition-colors">
                      <TableCell>
                        <div className="font-bold text-white text-sm">{plan.name_en || plan.name}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[200px] mt-0.5">{plan.description_en}</div>
                      </TableCell>
                      <TableCell className="font-black text-white">
                        {plan.type === 'free' ? '0 EGP (Free)' : `${plan.price} EGP`}
                      </TableCell>
                      <TableCell className="text-slate-300 font-semibold">{plan.maxStores} stores</TableCell>
                      <TableCell className="text-slate-300">
                        {plan.productLimit === -1 ? <span className="text-green-400 font-bold">Unlimited</span> : `${plan.productLimit} products`}
                      </TableCell>
                      <TableCell className="text-slate-300">{(plan.emailLimit || 0).toLocaleString()} /mo</TableCell>
                      <TableCell className="text-slate-300">{plan.orderFee} EGP</TableCell>
                      <TableCell>
                        <Badge 
                          className={plan.isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}
                        >
                          {plan.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => openEditModal(plan)}
                          className="bg-slate-800 hover:bg-slate-700 text-xs rounded-xl"
                        >
                          <Edit3 className="w-4 h-4 mr-1" />
                          Edit settings
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Plan Creation/Editing Dialog Form */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="bg-slate-900 border border-white/10 text-slate-100 max-w-2xl rounded-2xl overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="text-cyan-500 w-5 h-5" />
                {isEditMode ? 'Edit Plan Settings' : 'Create Subscription Plan'}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Fill in the localized information and parameters to build the subscription bundle.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-name-en" className="text-slate-300 font-semibold text-xs">Plan Name (English) *</Label>
                  <Input 
                    id="plan-name-en"
                    placeholder="Starter Plan"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="bg-slate-950 border border-white/10 text-white placeholder-slate-500"
                    disabled={updateMutation.isPending || createMutation.isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-name-ar" className="text-slate-300 font-semibold text-xs">Plan Name (Arabic)</Label>
                  <Input 
                    id="plan-name-ar"
                    placeholder="باقة المبتدئين"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    className="bg-slate-950 border border-white/10 text-white placeholder-slate-500"
                    disabled={updateMutation.isPending || createMutation.isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-desc-en" className="text-slate-300 font-semibold text-xs">Description (English) *</Label>
                  <Input 
                    id="plan-desc-en"
                    placeholder="Perfect for new e-commerce storefronts"
                    value={descEn}
                    onChange={(e) => setDescEn(e.target.value)}
                    className="bg-slate-950 border border-white/10 text-white placeholder-slate-500"
                    disabled={updateMutation.isPending || createMutation.isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-desc-ar" className="text-slate-300 font-semibold text-xs">Description (Arabic)</Label>
                  <Input 
                    id="plan-desc-ar"
                    placeholder="مناسبة للمتاجر الإلكترونية الجديدة"
                    value={descAr}
                    onChange={(e) => setDescAr(e.target.value)}
                    className="bg-slate-950 border border-white/10 text-white placeholder-slate-500"
                    disabled={updateMutation.isPending || createMutation.isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-type" className="text-slate-300 font-semibold text-xs">Plan Type</Label>
                  <select 
                    id="plan-type"
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value as 'free' | 'paid')}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none"
                  >
                    <option value="paid">Paid</option>
                    <option value="free">Free</option>
                  </select>
                </div>
                {planType === 'paid' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-price" className="text-slate-300 font-semibold text-xs">Monthly Price (EGP) *</Label>
                    <Input 
                      id="plan-price"
                      type="number"
                      placeholder="499"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="bg-slate-950 border border-white/10 text-white"
                      disabled={updateMutation.isPending || createMutation.isPending}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="plan-email" className="text-slate-300 font-semibold text-xs">Monthly Emails limit *</Label>
                  <Input 
                    id="plan-email"
                    type="number"
                    placeholder="500"
                    value={emailLimit}
                    onChange={(e) => setEmailLimit(e.target.value)}
                    className="bg-slate-950 border border-white/10 text-white"
                    disabled={updateMutation.isPending || createMutation.isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-stores" className="text-slate-300 font-semibold text-xs">Max Stores *</Label>
                  <Input 
                    id="plan-stores"
                    type="number"
                    value={maxStores}
                    onChange={(e) => setMaxStores(e.target.value)}
                    className="bg-slate-950 border border-white/10 text-white"
                    disabled={updateMutation.isPending || createMutation.isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-products" className="text-slate-300 font-semibold text-xs">Product Cap (-1: Unlim) *</Label>
                  <Input 
                    id="plan-products"
                    type="number"
                    value={productLimit}
                    onChange={(e) => setProductLimit(e.target.value)}
                    className="bg-slate-950 border border-white/10 text-white"
                    disabled={updateMutation.isPending || createMutation.isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-fee" className="text-slate-300 font-semibold text-xs">Order Tx Fee (EGP)</Label>
                  <Input 
                    id="plan-fee"
                    type="number"
                    step="0.1"
                    value={orderFee}
                    onChange={(e) => setOrderFee(e.target.value)}
                    className="bg-slate-950 border border-white/10 text-white"
                    disabled={updateMutation.isPending || createMutation.isPending}
                  />
                </div>
              </div>

              {/* Toggles for logic gates */}
              <div className="p-4 bg-slate-950 rounded-xl border border-white/5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">Feature Access gates</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="feat-domain" 
                      checked={customDomain}
                      onChange={(e) => setCustomDomain(e.target.checked)}
                      className="accent-cyan-500 w-4 h-4 rounded"
                    />
                    <Label htmlFor="feat-domain" className="text-xs text-slate-300">Custom Domain</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="feat-drop" 
                      checked={dropshipping}
                      onChange={(e) => setDropshipping(e.target.checked)}
                      className="accent-cyan-500 w-4 h-4 rounded"
                    />
                    <Label htmlFor="feat-drop" className="text-xs text-slate-300">Dropshipping</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="feat-ucd" 
                      checked={allowUCD}
                      onChange={(e) => setAllowUCD(e.target.checked)}
                      className="accent-cyan-500 w-4 h-4 rounded"
                    />
                    <Label htmlFor="feat-ucd" className="text-xs text-slate-300">Allow Upsell/Cross-sell</Label>
                  </div>
                </div>
              </div>

              {isEditMode && (
                <div className="space-y-1.5">
                  <Label htmlFor="edit-reason" className="text-slate-300 font-semibold text-xs">Reason for adjustment (Audited) *</Label>
                  <Input 
                    id="edit-reason"
                    placeholder="e.g. Lowered order fee commission, extended starter email limits"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="bg-slate-950 border border-white/10 text-white placeholder-slate-500"
                    disabled={updateMutation.isPending}
                  />
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={closeForm}
                  className="border-white/10 text-slate-300 rounded-xl"
                  disabled={updateMutation.isPending || createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl"
                  disabled={updateMutation.isPending || createMutation.isPending}
                >
                  {updateMutation.isPending || createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {isEditMode ? 'Save Settings' : 'Create Pricing Tiers'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
