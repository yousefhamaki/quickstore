'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Mail, Phone, Clock, Send, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export default function ContactPage() {
    const t = useTranslations('contact');

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-32 md:pt-40 pb-20 overflow-hidden">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
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

            {/* Main Content */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

                        {/* Contact Form */}
                        <div className="bg-white p-8 md:p-10 rounded-3xl border-2 border-gray-100 shadow-xl shadow-blue-50">
                            <div className="mb-8">
                                <h2 className="text-3xl font-black text-gray-900 mb-2">{t('form.title')}</h2>
                                <p className="text-gray-600 font-medium">{t('form.subtitle')}</p>
                            </div>

                            <form className="space-y-6 text-left rtl:text-right">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-900 ml-1 rtl:mr-1">{t('form.name.label')}</label>
                                        <Input
                                            placeholder={t('form.name.placeholder')}
                                            className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-900 ml-1 rtl:mr-1">{t('form.email.label')}</label>
                                        <Input
                                            type="email"
                                            placeholder={t('form.email.placeholder')}
                                            className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-900 ml-1 rtl:mr-1">{t('form.subject.label')}</label>
                                    <Input
                                        placeholder={t('form.subject.placeholder')}
                                        className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-900 ml-1 rtl:mr-1">{t('form.message.label')}</label>
                                    <Textarea
                                        placeholder={t('form.message.placeholder')}
                                        className="min-h-[150px] rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>

                                <Button className="w-full h-14 text-lg font-bold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all hover:scale-[1.02]">
                                    {t('form.submit')}
                                    <Send className="ml-2 h-5 w-5 rtl:mr-2 rtl:ml-0 rtl:rotate-180" />
                                </Button>
                            </form>
                        </div>

                        {/* Contact Info & Info Cards */}
                        <div className="flex flex-col justify-center space-y-8">
                            <h2 className="text-3xl font-black text-gray-900">{t('info.title')}</h2>

                            <InfoCard
                                icon={<Mail className="h-6 w-6" />}
                                label={t('info.email.label')}
                                value={t('info.email.value')}
                                color="blue"
                            />
                            <InfoCard
                                icon={<Phone className="h-6 w-6" />}
                                label={t('info.phone.label')}
                                value={t('info.phone.value')}
                                color="green"
                            />
                            <InfoCard
                                icon={<Clock className="h-6 w-6" />}
                                label={t('info.hours.label')}
                                value={t('info.hours.value')}
                                color="purple"
                            />
                            <InfoCard
                                icon={<MapPin className="h-6 w-6" />}
                                label="Office"
                                value="New Cairo, Egypt"
                                color="pink"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Preview Section */}
            <section className="py-20 bg-gray-50/50 border-y border-gray-100">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <h2 className="text-4xl font-black text-gray-900 mb-4">{t('faq.title')}</h2>
                    <p className="text-xl text-gray-600 mb-16">{t('faq.subtitle')}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FAQCard question={t('faq.q1.question')} answer={t('faq.q1.answer')} />
                        <FAQCard question={t('faq.q2.question')} answer={t('faq.q2.answer')} />
                        <FAQCard question={t('faq.q3.question')} answer={t('faq.q3.answer')} />
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

function InfoCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: 'blue' | 'green' | 'purple' | 'pink' }) {
    const colorMap = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        pink: 'bg-pink-50 text-pink-600',
    };

    return (
        <div className="flex items-center gap-6 p-6 rounded-2xl bg-white border border-gray-100 hover:shadow-lg transition-all text-left rtl:flex-row-reverse rtl:text-right">
            <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}

function FAQCard({ question, answer }: { question: string, answer: string }) {
    return (
        <div className="p-8 rounded-3xl bg-white border border-gray-100 hover:shadow-xl transition-all text-left rtl:text-right">
            <h3 className="text-xl font-black text-gray-900 mb-4">{question}</h3>
            <p className="text-gray-600 font-medium leading-relaxed">{answer}</p>
        </div>
    );
}
