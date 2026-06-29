'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@shared/services/api';
import AdminLayout from '../components/AdminLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@shared/components/ui/card';
import { Loader2, TrendingUp, DollarSign, Users, Store, ArrowUpRight } from 'lucide-react';

interface AnalyticsData {
  mrr: number;
  revenue: number;
  merchants: number;
  stores: number;
  registrations: number;
  date: string;
}

export default function DashboardHome() {
  const { data: stats, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['adminAnalytics'],
    queryFn: async () => {
      const response = await api.get('/admin/analytics?period=daily');
      return response.data as AnalyticsData;
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Overview Dashboard</h2>
          <p className="text-sm text-slate-400 mt-1">Real-time SaaS health analytics and platform metrics snapshot.</p>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mr-3" />
            Loading stats...
          </div>
        ) : error || !stats ? (
          <div className="p-6 bg-red-950/20 border border-red-500/20 rounded-2xl text-red-400">
            Failed to load analytics snapshot.
          </div>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-white/5 bg-slate-900/60 backdrop-blur-md glow-cyan">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Recurring Revenue</p>
                      <h3 className="text-2xl font-black text-white mt-2">{(stats.mrr || 0).toLocaleString()} EGP</h3>
                    </div>
                    <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-cyan-400 mt-4 font-semibold">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+12.4% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/5 bg-slate-900/60 backdrop-blur-md">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Platform Revenue</p>
                      <h3 className="text-2xl font-black text-white mt-2">{(stats.revenue || 0).toLocaleString()} EGP</h3>
                    </div>
                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                      <DollarSign className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-indigo-400 mt-4 font-semibold">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+8.2% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/5 bg-slate-900/60 backdrop-blur-md">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Merchants</p>
                      <h3 className="text-2xl font-black text-white mt-2">{stats.merchants || 0}</h3>
                    </div>
                    <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-violet-400 mt-4 font-semibold">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+{stats.registrations} signups today</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/5 bg-slate-900/60 backdrop-blur-md">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stores Hosted</p>
                      <h3 className="text-2xl font-black text-white mt-2">{stats.stores || 0}</h3>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                      <Store className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-4 font-semibold">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Healthy metrics</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-white/5 bg-slate-900/60 backdrop-blur-md p-6">
              <CardHeader className="p-0 pb-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-white">Platform Growth Trends</CardTitle>
                  <p className="text-xs text-slate-400">Visualization of Monthly Recurring Revenue (MRR) trajectory</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative w-full h-80 bg-slate-950/40 border border-white/5 rounded-2xl p-4 overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    <line x1="0" y1="50" x2="800" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" y1="125" x2="800" y2="125" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" y1="200" x2="800" y2="200" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" y1="275" x2="800" y2="275" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                    <path
                      d="M 0,300 L 0,250 Q 150,210 300,160 T 600,120 T 800,80 L 800,300 Z"
                      fill="url(#chartGrad)"
                    />

                    <path
                      d="M 0,250 Q 150,210 300,160 T 600,120 T 800,80"
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />

                    <circle cx="300" cy="160" r="6" fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="600" cy="120" r="6" fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="800" cy="80" r="6" fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
                  </svg>

                  <div className="absolute bottom-2 left-4 right-4 flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <span>Q1</span>
                    <span>Q2</span>
                    <span>Q3</span>
                    <span>Active (Now)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
