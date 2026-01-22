'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { Zap, ShieldCheck, Globe, BarChart3, ShoppingCart, Layout, Smartphone, Search, Lock } from 'lucide-react';

export default function FeaturesPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />

            <main className="flex-grow pt-32 pb-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-24">
                    <Badge className="mb-4 bg-blue-50 text-blue-600 border-blue-100 px-4 py-1.5 rounded-full text-sm font-black">
                        POWERFUL CAPABILITIES
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6">
                        Everything you need to<br />
                        <span className="text-blue-600">run a modern store.</span>
                    </h1>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
                        We've built all the tools required for the Egyptian market so you can focus on your business.
                    </p>
                </div>

                {/* Feature Sections */}
                <div className="max-w-7xl mx-auto px-4 space-y-32">
                    <FeatureSection
                        title="Localized Payment Verification"
                        description="Our unique activation workflow allows you to accept Instapay and VCash. Customers upload receipts, and you verify them in one click."
                        icon={<ShieldCheck className="h-12 w-12 text-green-500" />}
                        imagePosition="right"
                    />

                    <FeatureSection
                        title="Multi-Store Management"
                        description="Manage multiple brands or stores from a single merchant account. Each store has its own inventory, orders, and settings."
                        icon={<Layout className="h-12 w-12 text-blue-500" />}
                        imagePosition="left"
                    />

                    <FeatureSection
                        title="Responsive Storefronts"
                        description="Your store looks beautiful on every device. Our mobile-first themes ensure high conversion rates for social media traffic."
                        icon={<Smartphone className="h-12 w-12 text-purple-500" />}
                        imagePosition="right"
                    />
                </div>

                {/* All Features Grid */}
                <div className="max-w-7xl mx-auto px-4 mt-40">
                    <h2 className="text-4xl font-black text-center mb-20 text-gray-900">And much more...</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <SmallFeatureCard
                            icon={<Zap className="h-8 w-8 text-yellow-500" />}
                            title="Instant Setup"
                            description="Get your shop live in under 2 minutes."
                        />
                        <SmallFeatureCard
                            icon={<Globe className="h-8 w-8 text-blue-500" />}
                            title="Custom Domains"
                            description="Connect .com, .shop, or .net easily."
                        />
                        <SmallFeatureCard
                            icon={<BarChart3 className="h-8 w-8 text-indigo-500" />}
                            title="Advanced Analytics"
                            description="Know your visitors and sales trends."
                        />
                        <SmallFeatureCard
                            icon={<ShoppingCart className="h-8 w-8 text-orange-500" />}
                            title="Inventory Tracking"
                            description="Real-time stock updates across variants."
                        />
                        <SmallFeatureCard
                            icon={<Search className="h-8 w-8 text-pink-500" />}
                            title="SEO Optimized"
                            description="Rank better on Google search results."
                        />
                        <SmallFeatureCard
                            icon={<Lock className="h-8 w-8 text-gray-900" />}
                            title="Secure Hosting"
                            description="Enterprise-grade security for your data."
                        />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

function FeatureSection({ title, description, icon, imagePosition }: {
    title: string,
    description: string,
    icon: React.ReactNode,
    imagePosition: 'left' | 'right'
}) {
    return (
        <div className={`flex flex-col md:flex-row items-center gap-16 ${imagePosition === 'left' ? 'md:flex-row-reverse' : ''}`}>
            <div className="flex-1 space-y-6">
                <div className="h-20 w-20 rounded-2xl bg-gray-50 flex items-center justify-center">
                    {icon}
                </div>
                <h2 className="text-4xl font-black text-gray-900 leading-tight">{title}</h2>
                <p className="text-lg text-gray-500 font-medium leading-relaxed">
                    {description}
                </p>
            </div>
            <div className="flex-1 w-full flex items-center justify-center p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 aspect-video group">
                <div className="h-24 w-24 bg-blue-100 rounded-full animate-pulse group-hover:scale-110 transition-transform duration-500" />
            </div>
        </div>
    );
}

function SmallFeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="p-8 rounded-3xl bg-white border border-gray-100 hover:border-blue-500 hover:shadow-xl transition-all duration-300">
            <div className="mb-6 bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center">
                {icon}
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-500 font-medium">{description}</p>
        </div>
    );
}
