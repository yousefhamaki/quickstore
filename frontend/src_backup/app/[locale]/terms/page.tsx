'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { Scale, Info, Users, CreditCard, AlertCircle, ChevronRight, Mail, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TermsPage() {
    const t = useTranslations('terms');

    // Section icons mapping for a visual touch
    const icons: Record<string, React.ReactNode> = {
        acceptance: <Scale className="h-6 w-6" />,
        description: <Info className="h-6 w-6" />,
        responsibilities: <Users className="h-6 w-6" />,
        payments: <CreditCard className="h-6 w-6" />,
        liability: <AlertCircle className="h-6 w-6" />
    };

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring' as const,
                stiffness: 100
            }
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-white selection:bg-purple-100 selection:text-purple-900">
            <Navbar />

            <main className="flex-grow">
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_50%,rgba(147,51,234,0.05)_0%,rgba(255,255,255,0)_100%)]"></div>

                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
                    >
                        <Badge className="mb-6 bg-purple-600 hover:bg-purple-700 text-white border-0 px-6 py-2 rounded-full text-xs font-bold shadow-lg shadow-purple-200 transition-all uppercase tracking-widest">
                            {t('hero.badge')}
                        </Badge>
                        <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-8 tracking-tight leading-tight">
                            {t('hero.title')}
                        </h1>
                        <div className="flex items-center justify-center gap-2 text-gray-500 font-bold bg-gray-50 w-fit mx-auto px-4 py-2 rounded-xl border border-gray-100">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">{t('hero.lastUpdated')}</span>
                        </div>
                    </motion.div>
                </section>

                {/* Content Section */}
                <section className="pb-32">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            className="space-y-8"
                        >
                            {/* Dynamic Sections Rendering */}
                            {(t.raw('sections') as any[]).map((section: any) => (
                                <motion.div
                                    key={section.id}
                                    variants={itemVariants}
                                    className="group relative p-8 md:p-10 rounded-[2.5rem] border border-gray-100 bg-white hover:border-purple-200 hover:shadow-2xl hover:shadow-purple-50 transition-all duration-500 overflow-hidden"
                                >
                                    {/* Subtle pattern background on hover */}
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(147,51,234,0.02),transparent)] opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <div className="flex flex-col md:flex-row items-start gap-8 rtl:md:flex-row-reverse relative z-10">
                                        <div className="flex-shrink-0 w-16 h-16 rounded-[1.25rem] bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white group-hover:rotate-6 group-hover:scale-110 transition-all duration-500 shadow-sm">
                                            {icons[section.id] || <Scale className="h-8 w-8" />}
                                        </div>

                                        <div className="flex-grow space-y-6 rtl:text-right">
                                            <div className="flex items-center gap-3 rtl:flex-row-reverse">
                                                <h2 className="text-3xl font-black text-gray-900 leading-none">
                                                    {section.title}
                                                </h2>
                                                <div className="h-1 flex-grow bg-gray-50 rounded-full group-hover:bg-purple-50 transition-colors"></div>
                                            </div>
                                            <p className="text-gray-600 font-medium leading-relaxed text-xl md:text-2xl opacity-90">
                                                {section.content}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* Premium Footer Contact Section */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="mt-24 p-12 md:p-16 rounded-[3rem] bg-gray-900 text-white text-center overflow-hidden relative group"
                        >
                            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/30 rounded-full blur-[100px] -mr-48 -mt-48 group-hover:bg-purple-600/40 transition-colors duration-700"></div>
                            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] -ml-48 -mb-48 group-hover:bg-blue-600/30 transition-colors duration-700"></div>

                            <div className="relative z-10 space-y-8">
                                <div className="inline-flex p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 mb-2">
                                    <Mail className="h-8 w-8 text-purple-400" />
                                </div>
                                <h3 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                                    {t('footer.contactText')}
                                </h3>
                                <div>
                                    <a
                                        href="mailto:legal@buildora.com"
                                        className="inline-flex items-center gap-3 text-xl font-bold bg-white text-gray-900 px-10 py-5 rounded-2xl hover:bg-purple-50 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/20"
                                    >
                                        {t('footer.contactLink')}
                                        <ChevronRight className="h-6 w-6 rtl:rotate-180" />
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
