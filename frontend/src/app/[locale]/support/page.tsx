'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Mail, MessageCircle, Phone, HelpCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import Link from 'next/link';

export default function SupportPage() {
    const t = useTranslations('support');

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-32 md:pt-40 pb-20 overflow-hidden">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-green-400/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[120px]" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <Badge className="mb-6 bg-green-50 text-green-600 border-green-100 px-6 py-2 rounded-full text-sm font-bold">
                        {t('hero.badge')}
                    </Badge>

                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-gray-900 mb-6 leading-[1.1]">
                        {t('hero.title')}{' '}
                        <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                            {t('hero.titleHighlight')}
                        </span>
                    </h1>

                    <p className="text-lg sm:text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
                        {t('hero.subtitle')}
                    </p>
                </div>
            </section>

            {/* Support Channels */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-black text-gray-900">{t('channels.title')}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <ChannelCard
                            icon={<Mail className="h-10 w-10" />}
                            title={t('channels.email.title')}
                            description={t('channels.email.description')}
                            buttonText={t('channels.email.button')}
                            color="blue"
                        />
                        <ChannelCard
                            icon={<MessageCircle className="h-10 w-10" />}
                            title={t('channels.chat.title')}
                            description={t('channels.chat.description')}
                            buttonText={t('channels.chat.button')}
                            color="green"
                        />
                        <ChannelCard
                            icon={<Phone className="h-10 w-10" />}
                            title={t('channels.phone.title')}
                            description={t('channels.phone.description')}
                            buttonText={t('channels.phone.button')}
                            color="orange"
                        />
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-20 bg-gray-50/50 border-y border-gray-100">
                <div className="max-w-4xl mx-auto px-4">
                    <h2 className="text-4xl font-black text-gray-900 mb-12 text-center">{t('faq.title')}</h2>

                    <div className="space-y-6">
                        <SupportFAQItem question={t('faq.q1.question')} answer={t('faq.q1.answer')} />
                        <SupportFAQItem question={t('faq.q2.question')} answer={t('faq.q2.answer')} />
                        <SupportFAQItem question={t('faq.q3.question')} answer={t('faq.q3.answer')} />
                    </div>
                </div>
            </section>

            {/* Further Help CTA */}
            <section className="py-20 md:py-32 bg-white relative overflow-hidden">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-blue-50 text-blue-600 mb-8">
                        <HelpCircle className="h-12 w-12" />
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-6">
                        {t('contact.title')}
                    </h2>
                    <p className="text-xl text-gray-600 mb-10 font-medium">
                        {t('contact.subtitle')}
                    </p>
                    <Link href="/contact">
                        <Button
                            size="lg"
                            className="h-16 px-12 text-xl rounded-full bg-gray-900 hover:bg-gray-800 text-white font-bold transition-all hover:scale-105"
                        >
                            {t('contact.button')} <ArrowRight className="ml-2 h-6 w-6 rtl:mr-2 rtl:ml-0 rtl:rotate-180" />
                        </Button>
                    </Link>
                </div>
            </section>

            <Footer />
        </div>
    );
}

function ChannelCard({ icon, title, description, buttonText, color }: { icon: React.ReactNode, title: string, description: string, buttonText: string, color: 'blue' | 'green' | 'orange' }) {
    const colorMap = {
        blue: 'text-blue-600 bg-blue-50 hover:border-blue-500',
        green: 'text-green-600 bg-green-50 hover:border-green-500',
        orange: 'text-orange-600 bg-orange-50 hover:border-orange-500',
    };

    return (
        <div className={`p-10 rounded-3xl bg-white border-2 border-gray-50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 text-center ${colorMap[color]}`}>
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-8 ${colorMap[color].split(' ')[1]} ${colorMap[color].split(' ')[0]}`}>
                {icon}
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">{title}</h3>
            <p className="text-gray-600 font-medium leading-relaxed mb-10">{description}</p>
            <Button variant="outline" className="w-full h-12 rounded-xl border-gray-200 font-bold hover:bg-gray-50">
                {buttonText} <ExternalLink className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" />
            </Button>
        </div>
    );
}

function SupportFAQItem({ question, answer }: { question: string, answer: string }) {
    return (
        <div className="p-8 rounded-3xl bg-white border border-gray-100 hover:shadow-lg transition-all text-left rtl:text-right">
            <h3 className="text-xl font-black text-gray-900 mb-4">{question}</h3>
            <p className="text-gray-600 font-medium leading-relaxed">{answer}</p>
        </div>
    );
}
