'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@shared/services/api';
import AdminLayout from '../../../components/AdminLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Switch } from '@shared/components/ui/switch';
import { Badge } from '@shared/components/ui/badge';
import { Gift, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SignupGiftSettings {
  enabled: boolean;
  amount: number;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export default function SignupGiftSettingsAdmin() {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(true);
  const [amount, setAmount] = useState('500');
  const [reason, setReason] = useState('');

  const { data: settings, isLoading, error } = useQuery<SignupGiftSettings>({
    queryKey: ['adminSignupGiftSettings'],
    queryFn: async () => {
      const response = await api.get('/admin/settings/signup-gift');
      return response.data as SignupGiftSettings;
    },
  });

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setAmount(String(settings.amount));
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: { enabled: boolean; amount: number; reason: string }) => {
      return api.put('/admin/settings/signup-gift', data);
    },
    onSuccess: () => {
      toast.success('Signup gift settings updated');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['adminSignupGiftSettings'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update signup gift settings');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      toast.error('Amount must be a non-negative number');
      return;
    }
    if (!reason.trim()) {
      toast.error('Audit reason is required for changes to this setting');
      return;
    }

    updateMutation.mutate({ enabled, amount: parsedAmount, reason: reason.trim() });
  };

  const hasChanges = settings && (enabled !== settings.enabled || parseFloat(amount) !== settings.amount);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Signup Gift Promo</h2>
          <p className="text-sm text-slate-400 mt-1">
            Control the wallet credit new users receive once their email is verified.
          </p>
        </div>

        <Card className="border-white/5 bg-slate-900/60 backdrop-blur-md overflow-hidden max-w-2xl">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Gift className="text-cyan-500 w-5 h-5" />
              Wallet Welcome Gift
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-500 mr-2" />
                Loading current settings...
              </div>
            ) : error ? (
              <div className="py-16 text-center text-red-400">
                Failed to load signup gift settings.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-white">Promo enabled</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      When off, new users still get a wallet — just no gift credit.
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={setEnabled}
                    disabled={updateMutation.isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gift-amount" className="text-slate-300 font-semibold text-xs">
                    Gift amount (EGP) *
                  </Label>
                  <Input
                    id="gift-amount"
                    type="number"
                    min="0"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-slate-950 border border-white/10 text-white max-w-[200px]"
                    disabled={updateMutation.isPending}
                  />
                  <p className="text-[11px] text-slate-500">
                    Credited once, the first time a user's email is verified (or on Google sign-in, since Google emails are pre-verified).
                  </p>
                </div>

                {settings && (
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>Current live value:</span>
                    <Badge className={settings.enabled ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}>
                      {settings.enabled ? `Enabled — ${settings.amount} EGP` : 'Disabled'}
                    </Badge>
                  </div>
                )}

                {hasChanges && (
                  <div className="space-y-1.5">
                    <Label htmlFor="gift-reason" className="text-slate-300 font-semibold text-xs">
                      Reason for adjustment (Audited) *
                    </Label>
                    <Input
                      id="gift-reason"
                      placeholder="e.g. Reduced promo cost ahead of Q3 growth push"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="bg-slate-950 border border-white/10 text-white placeholder-slate-500"
                      disabled={updateMutation.isPending}
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl"
                    disabled={!hasChanges || updateMutation.isPending}
                  >
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Save Settings
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
