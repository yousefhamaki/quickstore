'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Zap, Globe, Palette, Smartphone,
    CreditCard, Wallet, Banknote,
    Package, ShoppingCart, BarChart3, Store,
    ArrowRight, Check
} from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { useTranslations } from 'next-intl';

export default function FeaturesPage() {
    const t = useTranslations('features');

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-32 md:pt-40 pb-20 overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute top-20 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <Badge className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                        {t('hero.badge')}
                    </Badge>

                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-gray-900 mb-6 leading-[1.1]">
                        {t('hero.title')}{' '}
                        <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                            {t('hero.titleHighlight')}
                        </span>
                    </h1>

                    <p className="text-lg sm:text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
                        {t('hero.subtitle')}
                    </p>
                </div>
            </section>

            {/* Core Features Section */}
            <section className="py-20 md:py-32 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
                            {t('coreFeatures.title')}
                        </h2>
                        <p className="text-lg md:text-xl text-gray-600 font-medium">
                            {t('coreFeatures.subtitle')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <FeatureCard
                            icon={<Zap className="h-10 w-10" />}
                            title={t('coreFeatures.instantSetup.title')}
                            description={t('coreFeatures.instantSetup.description')}
                            color="yellow"
                        />
                        <FeatureCard
                            icon={<Globe className="h-10 w-10" />}
                            title={t('coreFeatures.customDomains.title')}
                            description={t('coreFeatures.customDomains.description')}
                            color="blue"
                        />
                        <FeatureCard
                            icon={<Palette className="h-10 w-10" />}
                            title={t('coreFeatures.themeBuilder.title')}
                            description={t('coreFeatures.themeBuilder.description')}
                            color="purple"
                        />
                        <FeatureCard
                            icon={<Smartphone className="h-10 w-10" />}
                            title={t('coreFeatures.mobileOptimized.title')}
                            description={t('coreFeatures.mobileOptimized.description')}
                            color="green"
                        />
                    </div>
                </div>
            </section>

            {/* Payment Features Section */}
            <section className="py-20 md:py-32 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
                            {t('payments.title')}
                        </h2>
                        <p className="text-lg md:text-xl text-gray-600 font-medium">
                            {t('payments.subtitle')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <PaymentCard
                            icon={<CreditCard className="h-12 w-12" />}
                            title={t('payments.instapay.title')}
                            description={t('payments.instapay.description')}
                            features={['Automatic verification', 'Instant confirmation', 'Secure processing']}
                        />
                        <PaymentCard
                            icon={<Wallet className="h-12 w-12" />}
                            title={t('payments.vcash.title')}
                            description={t('payments.vcash.description')}
                            features={['Receipt upload', 'Manual verification', 'Fast approval']}
                        />
                        <PaymentCard
                            icon={<Banknote className="h-12 w-12" />}
                            title={t('payments.cashOnDelivery.title')}
                            description={t('payments.cashOnDelivery.description')}
                            features={['Traditional method', 'Customer preferred', 'Easy setup']}
                        />
                    </div>
                </div>
            </section>

            {/* Management Features Section */}
            <section className="py-20 md:py-32 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
                            {t('management.title')}
                        </h2>
                        <p className="text-lg md:text-xl text-gray-600 font-medium">
                            {t('management.subtitle')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <ManagementCard
                            icon={<Package className="h-12 w-12" />}
                            title={t('management.inventory.title')}
                            description={t('management.inventory.description')}
                            color="blue"
                        />
                        <ManagementCard
                            icon={<ShoppingCart className="h-12 w-12" />}
                            title={t('management.orders.title')}
                            description={t('management.orders.description')}
                            color="green"
                        />
                        <ManagementCard
                            icon={<BarChart3 className="h-12 w-12" />}
                            title={t('management.analytics.title')}
                            description={t('management.analytics.description')}
                            color="purple"
                        />
                        <ManagementCard
                            icon={<Store className="h-12 w-12" />}
                            title={t('management.multiStore.title')}
                            description={t('management.multiStore.description')}
                            color="pink"
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 md:py-32 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />

                <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                    <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-6">
                        {t('cta.title')}
                    </h2>
                    <p className="text-xl md:text-2xl text-white/90 mb-10 font-medium">
                        {t('cta.subtitle')}
                    </p>
                    <Link href="/auth/register">
                        <Button
                            size="lg"
                            className="h-16 px-12 text-xl rounded-full bg-white text-blue-600 hover:bg-gray-100 shadow-2xl font-bold transition-all duration-300 hover:scale-105"
                        >
                            {t('cta.button')} <ArrowRight className="ml-2 h-6 w-6" />
                        </Button>
                    </Link>
                </div>
            </section>

            <Footer />
        </div>
    );
}

// Feature Card Component
function FeatureCard({
    icon,
    title,
    description,
    color
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: 'yellow' | 'blue' | 'purple' | 'green';
}) {
    const colorClasses = {
        yellow: {
            iconBg: 'bg-yellow-50 group-hover:bg-yellow-100',
            iconText: 'text-yellow-500',
            border: 'hover:border-yellow-500',
        },
        blue: {
            iconBg: 'bg-blue-50 group-hover:bg-blue-100',
            iconText: 'text-blue-500',
            border: 'hover:border-blue-500',
        },
        purple: {
            iconBg: 'bg-purple-50 group-hover:bg-purple-100',
            iconText: 'text-purple-500',
            border: 'hover:border-purple-500',
        },
        green: {
            iconBg: 'bg-green-50 group-hover:bg-green-100',
            iconText: 'text-green-500',
            border: 'hover:border-green-500',
        },
    };

    const colors = colorClasses[color];

    return (
        <div className={`group p-8 rounded-3xl bg-white border-2 border-gray-100 ${colors.border} hover:shadow-2xl transition-all duration-300 hover:-translate-y-2`}>
            <div className={`mb-6 ${colors.iconBg} w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-300`}>
                <div className={colors.iconText}>
                    {icon}
                </div>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-3">
                {title}
            </h3>
            <p className="text-gray-600 font-medium leading-relaxed text-sm">
                {description}
            </p>
        </div>
    );
}

// Payment Card Component
function PaymentCard({
    icon,
    title,
    description,
    features
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    features: string[];
}) {
    return (
        <div className="group p-8 rounded-3xl bg-white border-2 border-gray-100 hover:border-blue-500 hover:shadow-2xl transition-all duration-300">
            <div className="mb-6 bg-blue-50 group-hover:bg-blue-100 w-20 h-20 rounded-2xl flex items-center justify-center transition-colors duration-300">
                <div className="text-blue-500">
                    {icon}
                </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">
                {title}
            </h3>
            <p className="text-gray-600 font-medium leading-relaxed mb-6">
                {description}
            </p>
            <ul className="space-y-3">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3 text-sm font-medium text-gray-700">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// Management Card Component
function ManagementCard({
    icon,
    title,
    description,
    color
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: 'blue' | 'green' | 'purple' | 'pink';
}) {
    const colorClasses = {
        blue: {
            iconBg: 'bg-blue-50 group-hover:bg-blue-100',
            iconText: 'text-blue-500',
            border: 'hover:border-blue-500',
        },
        green: {
            iconBg: 'bg-green-50 group-hover:bg-green-100',
            iconText: 'text-green-500',
            border: 'hover:border-green-500',
        },
        purple: {
            iconBg: 'bg-purple-50 group-hover:bg-purple-100',
            iconText: 'text-purple-500',
            border: 'hover:border-purple-500',
        },
        pink: {
            iconBg: 'bg-pink-50 group-hover:bg-pink-100',
            iconText: 'text-pink-500',
            border: 'hover:border-pink-500',
        },
    };

    const colors = colorClasses[color];

    return (
        <div className={`group p-10 rounded-3xl bg-white border-2 border-gray-100 ${colors.border} hover:shadow-2xl transition-all duration-300 hover:-translate-y-2`}>
            <div className={`mb-6 ${colors.iconBg} w-20 h-20 rounded-2xl flex items-center justify-center transition-colors duration-300`}>
                <div className={colors.iconText}>
                    {icon}
                </div>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-4">
                {title}
            </h3>
            <p className="text-gray-600 font-medium leading-relaxed text-base md:text-lg">
                {description}
            </p>
        </div>
    );
}
