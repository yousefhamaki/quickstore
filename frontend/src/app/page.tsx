'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ShoppingCart, ShieldCheck, Zap, Globe, BarChart3 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <ShoppingCart className="text-white h-6 w-6" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-gray-900">QUICKSTORE</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">Features</Link>
              <Link href="#pricing" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">Pricing</Link>
              <Link href="/auth/login" className="text-sm font-bold text-gray-900">Sign In</Link>
              <Link href="/auth/register">
                <Button className="bg-blue-600 hover:bg-blue-700 rounded-full px-6 font-bold shadow-lg shadow-blue-200">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <Badge className="mb-4 bg-blue-50 text-blue-600 border-blue-100 px-4 py-1.5 rounded-full text-sm font-black">
            NEXT-GEN E-COMMERCE
          </Badge>
          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-gray-900 mb-8 leading-[1.1]">
            Build Your Store in <span className="text-blue-600">Minutes.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-12 font-medium">
            The all-in-one multi-tenant SaaS platform for modern merchants in Egypt. Accept Instapay, VCash, and grow your brand effortlessly.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/auth/register">
              <Button className="h-16 px-10 text-xl rounded-full bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-300 font-black">
                Start Selling Now <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </Link>
            <Button variant="outline" className="h-16 px-10 text-xl rounded-full font-bold border-2">
              View Demo
            </Button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 blur-[120px] rounded-full -z-10 animate-gradient" />
      </section>

      {/* Social Proof */}
      <section className="py-20 border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-10">Trusted by 500+ merchants in Egypt</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Replace with real logos in production */}
            <span className="text-3xl font-black italic">CLOTHING CO</span>
            <span className="text-3xl font-black italic">TECH HUB</span>
            <span className="text-3xl font-black italic">VIBE STORE</span>
            <span className="text-3xl font-black italic">EGY SHOP</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">Everything you need to succeed</h2>
            <p className="text-lg text-gray-500 font-medium max-w-2xl mx-auto">Powerful features designed specifically for the Egyptian market.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <FeatureCard
              icon={<Zap className="h-10 w-10 text-yellow-500" />}
              title="Instant Setup"
              description="Sign up and launch your store in under 2 minutes. No technical skills required."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-10 w-10 text-green-500" />}
              title="Secure Local Payments"
              description="Verify Instapay and VCash receipts with our specialized activation workflow."
            />
            <FeatureCard
              icon={<Globe className="h-10 w-10 text-blue-500" />}
              title="Custom Domains"
              description="Connect your own .com or .shop domain to build your professional brand."
            />
            <FeatureCard
              icon={<BarChart3 className="h-10 w-10 text-purple-500" />}
              title="Advanced Analytics"
              description="Track sales, visitors, and conversion rates with detailed visual reports."
            />
            <FeatureCard
              icon={<ShoppingCart className="h-10 w-10 text-orange-500" />}
              title="Inventory Management"
              description="Manage variants, stock levels, and get notified when you're running low."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-10 w-10 text-indigo-500" />}
              title="Super Admin Control"
              description="Our team manually reviews every subscription to ensure platform quality."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-20 mt-auto">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-gray-800 pb-20 mb-10">
          <div className="space-y-6 md:col-span-2">
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <ShoppingCart className="text-white h-6 w-6" />
              </div>
              <span className="text-2xl font-black tracking-tighter">QUICKSTORE</span>
            </div>
            <p className="text-gray-400 max-w-md font-medium">
              Empowering the next generation of Egyptian entrepreneurs with professional, reliable, and accessible e-commerce technology.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-black uppercase text-xs tracking-widest text-blue-500">Platform</h4>
            <ul className="space-y-2 text-gray-400 font-medium">
              <li><Link href="#features">Features</Link></li>
              <li><Link href="#pricing">Pricing</Link></li>
              <li><Link href="/auth/register">Register</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-black uppercase text-xs tracking-widest text-blue-500">Company</h4>
            <ul className="space-y-2 text-gray-400 font-medium">
              <li><Link href="#">About Us</Link></li>
              <li><Link href="#">Contact</Link></li>
              <li><Link href="#">Support</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm font-bold">
          <p>© 2026 QuickStore Inc. All rights reserved.</p>
          <div className="flex space-x-8 mt-4 md:mt-0">
            <Link href="#">Privacy Policy</Link>
            <Link href="#">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group p-8 rounded-3xl bg-white border border-gray-100 hover:border-blue-500 hover:shadow-2xl transition-all duration-300">
      <div className="mb-6 bg-gray-50 w-20 h-20 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
        {icon}
      </div>
      <h3 className="text-2xl font-black text-gray-900 mb-4">{title}</h3>
      <p className="text-gray-500 font-medium leading-relaxed">{description}</p>
    </div>
  );
}
