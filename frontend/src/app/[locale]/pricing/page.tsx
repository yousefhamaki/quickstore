'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Check, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import Link from 'next/link';
import api from '@/services/api';

interface Plan {
    _id: string;
    name_en: string;
    name_ar: string;
    description_en: string;
    description_ar: string;
    type: 'free' | 'paid';
    price: number;
    currency: string;
    features_en: string[];
    features_ar: string[];
    isActive: boolean;
}

export default function PricingPage() {
    const t = useTranslations('pricing');
    const locale = useLocale();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const response = await api.get<Plan[]>('/plans');
                setPlans(response.data);
            } catch (err) {
                console.error('Error fetching plans:', err);
                setError('Failed to load plans. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPlans();
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-32 md:pt-40 pb-20 overflow-hidden">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-0 left-1/2 w-[1000px] h-[600px] bg-blue-400/10 rounded-full blur-[120px] -translate-x-1/2" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <Badge className="mb-6 bg-blue-50 text-blue-600 border-blue-100 px-6 py-2 rounded-full text-sm font-bold">
                        {t('hero.badge')}
                    </Badge>

                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-gray-900 mb-6 leading-[1.1]">
                        {t('hero.title')}{' '}
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {t('hero.titleHighlight')}
                        </span>
                    </h1>

                    <p className="text-lg sm:text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
                        {t('hero.subtitle')}
                    </p>
                </div>
            </section>

            {/* Plans Section */}
            <section className="py-20 bg-white min-h-[400px]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                            <p className="text-gray-500 font-medium tracking-tight">Loading plans...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20">
                            <p className="text-red-500 font-bold text-xl">{error}</p>
                            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                                Try Again
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                            {plans.map((plan) => (
                                <PricingCard
                                    key={plan._id}
                                    name={locale === 'ar' ? plan.name_ar : plan.name_en}
                                    price={`${plan.currency} ${plan.price}`}
                                    period={plan.price === 0 ? "Forever" : (locale === 'ar' ? "شهرياً" : "Monthly")}
                                    description={locale === 'ar' ? plan.description_ar : plan.description_en}
                                    buttonText={plan.price === 0 ? (locale === 'ar' ? 'ابدأ مجاناً' : 'Start for Free') : (locale === 'ar' ? 'ابدأ الآن' : 'Get Started')}
                                    features={locale === 'ar' ? plan.features_ar : plan.features_en}
                                    popular={plan.name_en === 'Professional'}
                                    color={plan.type === 'free' ? 'gray' : (plan.name_en === 'Professional' ? 'blue' : 'purple')}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-20 bg-gray-50/50">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-4xl font-black text-gray-900 mb-4">{t('faq.title')}</h2>
                    <p className="text-xl text-gray-600 mb-16">{t('faq.subtitle')}</p>

                    <div className="space-y-8 text-left rtl:text-right">
                        <FAQItem question={t('faq.q1.question')} answer={t('faq.q1.answer')} />
                        <FAQItem question={t('faq.q2.question')} answer={t('faq.q2.answer')} />
                        <FAQItem question={t('faq.q3.question')} answer={t('faq.q3.answer')} />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 md:py-32 bg-blue-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />

                <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                    <h2 className="text-4xl sm:text-5xl font-black text-white mb-6">
                        {t('cta.title')}
                    </h2>
                    <p className="text-xl md:text-2xl text-white/90 mb-10 font-medium">
                        {t('cta.subtitle')}
                    </p>
                    <Link href="/auth/register">
                        <Button
                            size="lg"
                            className="h-16 px-12 text-xl rounded-full bg-white text-blue-600 hover:bg-gray-100 font-bold transition-all hover:scale-105"
                        >
                            {t('cta.button')} <ArrowRight className="ml-2 h-6 w-6 rtl:mr-2 rtl:ml-0 rtl:rotate-180" />
                        </Button>
                    </Link>
                </div>
            </section>

            <Footer />
        </div>
    );
}

function PricingCard({
    name, price, period, description, buttonText, features, popular, color
}: {
    name: string, price: string, period: string, description: string, buttonText: string, features: string[], popular?: boolean, color: 'gray' | 'blue' | 'purple'
}) {
    const isPopular = popular;

    return (
        <div className={`relative p-8 md:p-10 rounded-3xl bg-white border-2 transition-all duration-300 hover:-translate-y-2 ${isPopular ? 'border-blue-600 shadow-xl shadow-blue-100 md:scale-105 z-10' : 'border-gray-100 hover:border-blue-200 hover:shadow-xl'}`}>
            {isPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-black px-4 py-1.5 rounded-full flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>POPULAR</span>
                </div>
            )}

            <div className="mb-8">
                <h3 className="text-lg font-black text-gray-400 uppercase tracking-widest mb-4">{name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-black text-gray-900">{price}</span>
                    <span className="text-gray-500 font-bold">/{period}</span>
                </div>
                <p className="text-gray-600 font-medium h-12 overflow-hidden">{description}</p>
            </div>

            <Link href="/auth/register" className="block mb-10">
                <Button
                    className={`w-full h-14 text-lg font-bold rounded-xl transition-all ${isPopular ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200' : 'bg-gray-900 hover:bg-gray-800'}`}
                >
                    {buttonText}
                </Button>
            </Link>

            <ul className="space-y-4">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm font-bold text-gray-700 rtl:flex-row-reverse">
                        <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isPopular ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                            <Check className="h-3 w-3" />
                        </div>
                        <span className="rtl:text-right">{feature}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
    return (
        <div className="p-8 rounded-2xl bg-white border border-gray-100 hover:shadow-lg transition-all">
            <h3 className="text-xl font-black text-gray-900 mb-4">{question}</h3>
            <p className="text-gray-600 font-medium leading-relaxed">{answer}</p>
        </div>
    );
}

