'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@shared/services/api';
import AdminLayout from '../../components/AdminLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Loader2, ArrowDownCircle, ArrowUpCircle, TrendingDown, TrendingUp, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';

interface Transaction {
  _id: string;
  userId: { _id: string; name: string; email: string } | null;
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
  referenceId?: string;
  createdAt: string;
}

interface TransactionStats {
  totalDebited: number;
  totalCredited: number;
  debitCount: number;
  creditCount: number;
  byReason: { reason: string; total: number; count: number }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const REASON_LABELS: Record<string, string> = {
  plan_payment: 'Plan Payment',
  plan_upgrade: 'Plan Upgrade',
  plan_renewal: 'Plan Renewal',
  recharge: 'Wallet Recharge',
  order_fee: 'Order Fee',
  addon_purchase: 'Add-On Purchase',
  gift: 'Gift / Adjustment',
  admin_adjustment: 'Admin Adjustment',
};

const REASON_COLORS: Record<string, string> = {
  plan_payment: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  plan_upgrade: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
  plan_renewal: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  recharge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  order_fee: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  addon_purchase: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  gift: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  admin_adjustment: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const buildParams = () => {
    const p: Record<string, string> = { page: String(page), limit: '25' };
    if (typeFilter !== 'all') p.type = typeFilter;
    if (reasonFilter !== 'all') p.reason = reasonFilter;
    if (from) p.from = from;
    if (to) p.to = to;
    return p;
  };

  const { data: listData, isLoading: listLoading } = useQuery<{ transactions: Transaction[]; pagination: Pagination }>({
    queryKey: ['admin-transactions', page, typeFilter, reasonFilter, from, to],
    queryFn: async (): Promise<{ transactions: Transaction[]; pagination: Pagination }> => {
      const params = new URLSearchParams(buildParams());
      const res = await api.get(`/admin/transactions?${params}`);
      return res.data as { transactions: Transaction[]; pagination: Pagination };
    }
  });

  const { data: stats, isLoading: statsLoading } = useQuery<TransactionStats>({
    queryKey: ['admin-transaction-stats', from, to],
    queryFn: async (): Promise<TransactionStats> => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await api.get(`/admin/transactions/stats?${params}`);
      return res.data as TransactionStats;
    }
  });

  const transactions = listData?.transactions ?? [];
  const pagination = listData?.pagination;
  const net = (stats?.totalCredited ?? 0) - (stats?.totalDebited ?? 0);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
              <BarChart3 className="w-5 h-5 text-violet-400" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Wallet Transactions</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1 ml-12">All system-generated wallet movements across all merchant accounts.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/3 border-white/8 rounded-2xl">
            <CardContent className="p-5">
              {statsLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Debited</p>
                  </div>
                  <p className="text-2xl font-black text-white">{(stats?.totalDebited ?? 0).toLocaleString()} <span className="text-sm font-bold text-slate-500">EGP</span></p>
                  <p className="text-xs text-slate-500 mt-1">{stats?.debitCount ?? 0} transactions</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/3 border-white/8 rounded-2xl">
            <CardContent className="p-5">
              {statsLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Credited</p>
                  </div>
                  <p className="text-2xl font-black text-white">{(stats?.totalCredited ?? 0).toLocaleString()} <span className="text-sm font-bold text-slate-500">EGP</span></p>
                  <p className="text-xs text-slate-500 mt-1">{stats?.creditCount ?? 0} transactions</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/3 border-white/8 rounded-2xl">
            <CardContent className="p-5">
              {statsLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    {net >= 0 ? <ArrowUpCircle className="w-4 h-4 text-emerald-400" /> : <ArrowDownCircle className="w-4 h-4 text-rose-400" />}
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Movement</p>
                  </div>
                  <p className={`text-2xl font-black ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {net >= 0 ? '+' : ''}{net.toLocaleString()} <span className="text-sm font-bold text-slate-500">EGP</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">credits minus debits</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/3 border-white/8 rounded-2xl">
            <CardContent className="p-5">
              {statsLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-violet-400" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Transactions</p>
                  </div>
                  <p className="text-2xl font-black text-white">{((stats?.debitCount ?? 0) + (stats?.creditCount ?? 0)).toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">across all accounts</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {!statsLoading && stats && stats.byReason.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.byReason.map(r => (
              <div key={r.reason} className={`p-4 rounded-2xl border ${REASON_COLORS[r.reason] ?? 'bg-white/3 border-white/8 text-slate-400'}`}>
                <p className="text-xs font-black uppercase tracking-wider mb-1">{REASON_LABELS[r.reason] ?? r.reason}</p>
                <p className="text-lg font-black">{r.total.toLocaleString()} EGP</p>
                <p className="text-[10px] opacity-70 font-bold mt-0.5">{r.count} entries</p>
              </div>
            ))}
          </div>
        )}

        <Card className="bg-white/3 border-white/8 rounded-2xl">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="h-10 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold px-3 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="all">All Types</option>
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>

              <select
                value={reasonFilter}
                onChange={(e) => { setReasonFilter(e.target.value); setPage(1); }}
                className="h-10 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold px-3 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="all">All Reasons</option>
                <option value="plan_payment">Plan Payment</option>
                <option value="plan_upgrade">Plan Upgrade</option>
                <option value="plan_renewal">Plan Renewal</option>
                <option value="recharge">Wallet Recharge</option>
                <option value="order_fee">Order Fee</option>
                <option value="addon_purchase">Add-On Purchase</option>
                <option value="gift">Gift / Adjustment</option>
                <option value="admin_adjustment">Admin Adjustment</option>
              </select>

              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                className="bg-white/5 border-white/10 text-white rounded-xl h-10" />
              <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
                className="bg-white/5 border-white/10 text-white rounded-xl h-10" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/3 border-white/8 rounded-2xl overflow-hidden">
          <CardHeader className="px-6 pt-6 pb-4 border-b border-white/8">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-black text-white">Transaction History</CardTitle>
              {pagination && (
                <p className="text-xs text-slate-400 font-bold">
                  {pagination.total.toLocaleString()} total · Page {pagination.page} of {pagination.pages}
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {listLoading ? (
              <div className="flex items-center justify-center py-20 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                <p className="text-sm font-bold text-slate-400">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-sm font-bold text-slate-500">No transactions found for the selected filters.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wider pl-6">Merchant</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wider">Type</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wider">Amount</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wider">Reason</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wider pr-6">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(tx => (
                    <TableRow key={tx._id} className="border-white/5 hover:bg-white/2 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="font-bold text-white text-sm">{tx.userId?.name ?? 'Unknown'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{tx.userId?.email ?? '—'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs font-black rounded-lg border ${tx.type === 'debit'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                          {tx.type === 'debit' ? '↓ Debit' : '↑ Credit'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-black ${tx.type === 'debit' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {tx.type === 'debit' ? '-' : '+'}{tx.amount.toFixed(2)} EGP
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs font-bold rounded-lg border ${REASON_COLORS[tx.reason] ?? 'bg-white/5 text-slate-400 border-white/10'}`}>
                          {REASON_LABELS[tx.reason] ?? tx.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="text-xs text-slate-400 font-bold">{new Date(tx.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-600 mt-0.5">{new Date(tx.createdAt).toLocaleTimeString()}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/8">
              <Button variant="outline"
                className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 h-9 px-4 text-xs font-bold"
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page >= pagination.pages - 2 ? pagination.pages - 4 + i : page - 2 + i;
                  if (p < 1 || p > pagination.pages) return null;
                  return (
                    <Button key={p} onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-xl text-xs font-black p-0 ${p === page
                        ? 'bg-violet-600 text-white hover:bg-violet-700'
                        : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'}`}>
                      {p}
                    </Button>
                  );
                })}
              </div>
              <Button variant="outline"
                className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 h-9 px-4 text-xs font-bold"
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}

