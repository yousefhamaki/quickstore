'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Target, History, Heart, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import Link from 'next/link';

export default function AboutPage() {
    const t = useTranslations('about');

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-32 md:pt-40 pb-20 overflow-hidden">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-10 right-1/4 w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-10 left-1/4 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px]" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <Badge className="mb-6 bg-purple-50 text-purple-600 border-purple-100 px-6 py-2 rounded-full text-sm font-bold">
                        {t('hero.badge')}
                    </Badge>

                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-gray-900 mb-6 leading-[1.1]">
                        {t('hero.title')}{' '}
                        <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                            {t('hero.titleHighlight')}
                        </span>
                    </h1>

                    <p className="text-lg sm:text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
                        {t('hero.subtitle')}
                    </p>
                </div>
            </section>

            {/* Mission Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-blue-50 text-blue-600">
                                <Target className="h-8 w-8" />
                            </div>
                            <h2 className="text-4xl font-black text-gray-900">{t('mission.title')}</h2>
                            <p className="text-xl text-gray-600 leading-relaxed font-medium">
                                {t('mission.description')}
                            </p>
                            <ul className="space-y-4">
                                {[t('mission.goal1'), t('mission.goal2'), t('mission.goal3')].map((goal, idx) => (
                                    <li key={idx} className="flex items-center gap-4 text-lg font-bold text-gray-700 rtl:flex-row-reverse">
                                        <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                            <Check className="h-4 w-4" />
                                        </div>
                                        {goal}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="relative">
                            <div className="aspect-video bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl overflow-hidden shadow-2xl relative">
                                <div className="absolute inset-0 bg-grid-white/20" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <h1 className="text-white text-4xl font-black opacity-30 drop-shadow-lg">BUILDORA</h1>
                                </div>
                            </div>
                            <div className="absolute -bottom-6 -right-6 -z-10 w-full h-full border-4 border-gray-100 rounded-3xl" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Story Section */}
            <section className="py-20 bg-gray-50/50">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-purple-50 text-purple-600 mb-8">
                        <History className="h-8 w-8" />
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 mb-12">{t('story.title')}</h2>
                    <div className="space-y-6 text-lg text-gray-600 font-medium leading-relaxed text-left rtl:text-right">
                        <p>{t('story.p1')}</p>
                        <p>{t('story.p2')}</p>
                        <p>{t('story.p3')}</p>
                    </div>
                </div>
            </section>

            {/* Values Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-pink-50 text-pink-600 mb-6">
                            <Heart className="h-8 w-8" />
                        </div>
                        <h2 className="text-4xl font-black text-gray-900">{t('values.title')}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <ValueCard
                            title={t('values.innovation.title')}
                            description={t('values.innovation.description')}
                            icon={<Sparkles className="h-8 w-8 text-blue-500" />}
                        />
                        <ValueCard
                            title={t('values.accessibility.title')}
                            description={t('values.accessibility.description')}
                            icon={<Smartphone className="h-8 w-8 text-purple-500" />}
                        />
                        <ValueCard
                            title={t('values.integrity.title')}
                            description={t('values.integrity.description')}
                            icon={<ShieldCheck className="h-8 w-8 text-pink-500" />}
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 md:py-32 bg-gray-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-600/10 opacity-50" />

                <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                    <h2 className="text-4xl sm:text-5xl font-black text-white mb-6">
                        {t('cta.title')}
                    </h2>
                    <p className="text-xl md:text-2xl text-white/70 mb-10 font-medium">
                        {t('cta.subtitle')}
                    </p>
                    <Link href="/auth/register">
                        <Button
                            size="lg"
                            className="h-16 px-12 text-xl rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all hover:scale-105"
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

function ValueCard({ title, description, icon }: { title: string, description: string, icon: React.ReactNode }) {
    return (
        <div className="p-10 rounded-3xl bg-white border-2 border-gray-50 hover:border-blue-500 hover:shadow-2xl transition-all duration-300 text-left rtl:text-right">
            <div className="mb-6">{icon}</div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">{title}</h3>
            <p className="text-gray-600 font-medium leading-relaxed">{description}</p>
        </div>
    );
}

import { ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
