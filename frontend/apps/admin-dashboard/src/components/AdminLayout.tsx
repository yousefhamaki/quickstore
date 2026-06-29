'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@shared/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@shared/services/api';
import { 
  LayoutDashboard, 
  Users, 
  Store, 
  Receipt, 
  CreditCard, 
  LifeBuoy, 
  LogOut, 
  Search, 
  Menu, 
  X, 
  ShieldAlert, 
  Lock,
  Loader2 
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Badge } from '@shared/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@shared/components/ui/card';
import { toast } from 'sonner';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  roles: string[];
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['super_admin', 'finance_admin', 'read_only_admin'] },
  { name: 'Merchants', href: '/merchants', icon: Users, roles: ['super_admin', 'finance_admin', 'read_only_admin'] },
  { name: 'Stores', href: '/stores', icon: Store, roles: ['super_admin', 'finance_admin', 'read_only_admin'] },
  { name: 'Receipts Queue', href: '/receipts', icon: Receipt, roles: ['super_admin', 'finance_admin', 'read_only_admin'] },
  { name: 'Subscription Plans', href: '/plans', icon: CreditCard, roles: ['super_admin', 'finance_admin'] },
  { name: 'Support Tickets', href: '/tickets', icon: LifeBuoy, roles: ['super_admin', 'support_admin', 'read_only_admin'] },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, login, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    setAuthLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const data = response.data as any;
      
      const userRole = data.role;
      const isAdmin = ['super_admin', 'finance_admin', 'support_admin', 'read_only_admin'].includes(userRole);
      
      if (!isAdmin) {
        toast.error('Unauthorized access. Admin role required.');
        setAuthLoading(false);
        return;
      }

      login(data.token, data);
      toast.success(`Welcome back, ${data.name}!`);
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  // If loading session cookie, show a spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
        <p className="text-sm font-semibold tracking-wide">Securing administrative workspace...</p>
      </div>
    );
  }

  // If not logged in, render the login page
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px]" />

        <Card className="w-full max-w-md border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-2xl relative z-10 glow-indigo">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-4">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-white">QuickStore</CardTitle>
            <p className="text-xs font-medium tracking-wider text-cyan-400 uppercase mt-1">Super Admin Control Room</p>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-300">Email Address</label>
                <Input 
                  type="email" 
                  placeholder="admin@quickstore.live"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-950/50 border-white/10 text-white placeholder-slate-500 focus-visible:ring-cyan-500 focus-visible:border-cyan-500 focus:outline-none"
                  disabled={authLoading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-300">Password</label>
                <Input 
                  type="password" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-950/50 border-white/10 text-white placeholder-slate-500 focus-visible:ring-cyan-500 focus-visible:border-cyan-500 focus:outline-none"
                  disabled={authLoading}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 text-white font-bold h-11 rounded-xl shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all duration-300 mt-6"
                disabled={authLoading}
              >
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Secure Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userRole = user.role;
  const isAdmin = ['super_admin', 'finance_admin', 'support_admin', 'read_only_admin'].includes(userRole);

  // If user role is invalid (e.g. merchant user tries to bypass), show unauthorized block
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-500/20 bg-slate-900/60 backdrop-blur-xl shadow-2xl glow-indigo text-center p-8 space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-2">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white">Access Denied</h2>
          <p className="text-sm text-slate-400">
            This panel is reserved for QuickStore Administrative personnel. Your account ({user.email}) does not possess the correct privileges.
          </p>
          <Button onClick={logout} className="bg-red-600 hover:bg-red-700 text-white w-full rounded-xl">
            <LogOut className="w-5 h-5 mr-2" />
            Sign Out
          </Button>
        </Card>
      </div>
    );
  }

  // Filter sidebar navigation links based on client PBAC permissions
  const filteredNavItems = NAVIGATION_ITEMS.filter((item) => item.roles.includes(userRole));

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar - Desktop Layout */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 bg-slate-900 border-r border-white/5 p-6 flex-shrink-0 justify-between">
        <div className="space-y-8">
          {/* Header logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-white leading-none">QuickStore</h1>
              <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase">Admin Portal</span>
            </div>
          </div>

          {/* Navigation link grid */}
          <nav className="space-y-1.5">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/10 text-cyan-400 border-l-4 border-cyan-500 glow-cyan' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & sign out */}
        <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 space-y-4">
          <div>
            <p className="text-sm font-bold text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate mb-2">{user.email}</p>
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 uppercase text-[9px] font-extrabold px-2 py-0.5">
              {user.role.replace('_', ' ')}
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            onClick={logout}
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl px-3"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Sidebar - Mobile Layout */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-72 bg-slate-900 p-6 z-10 border-r border-white/5 h-full animate-in slide-in-from-left duration-300 justify-between">
            <button 
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="space-y-8 mt-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-extrabold text-lg text-white leading-none">QuickStore</h1>
                  <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase">Admin Portal</span>
                </div>
              </div>

              <nav className="space-y-1.5">
                {filteredNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${
                        isActive 
                          ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/10 text-cyan-400 border-l-4 border-cyan-500' 
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 space-y-4">
              <div>
                <p className="text-sm font-bold text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate mb-2">{user.email}</p>
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 uppercase text-[9px] font-extrabold px-2 py-0.5">
                  {user.role.replace('_', ' ')}
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                onClick={logout}
                className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl px-3"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Sign Out
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Global Search Interface */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-950/50 border border-white/10 rounded-xl w-80 text-slate-400">
              <Search className="w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Global admin lookup (Esc)" 
                className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
                disabled
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Gateway Live</span>
            </div>
          </div>
        </header>

        {/* Content Pane */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950 relative">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
export default AdminLayout;
