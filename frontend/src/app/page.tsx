'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ShieldCheck, Zap, Globe } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />

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
            <span className="text-3xl font-black italic">CLOTHING CO</span>
            <span className="text-3xl font-black italic">TECH HUB</span>
            <span className="text-3xl font-black italic">VIBE STORE</span>
            <span className="text-3xl font-black italic">EGY SHOP</span>
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section className="py-32">
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
          </div>
          <div className="mt-16 text-center">
            <Link href="/features">
              <Button variant="outline" className="rounded-full px-8 font-bold border-2">
                Explore All Features <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
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
