'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useTranslations } from 'next-intl';
import { Mail, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface NewsletterFormProps {
    storeId: string;
    primaryColor: string;
}

export default function NewsletterForm({ storeId, primaryColor }: NewsletterFormProps) {
    const t = useTranslations('store.home');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [honeypot, setHoneypot] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
            const cleanApiUrl = apiBase.replace(/\/api$/, '');
            const response = await axios.post<any>(`${cleanApiUrl}/api/public/stores/${storeId}/newsletter/subscribe`, {
                email,
                source: 'storefront_footer',
                consentText: 'I agree to receive store newsletter updates.',
                honeypot
            });

            if (response.data?.success) {
                setSuccess(true);
                setEmail('');
            } else {
                setError(response.data?.message || 'Something went wrong. Please try again.');
            }
        } catch (err: any) {
            console.error('Newsletter submission error:', err);
            setError(
                err?.response?.data?.message || 
                'Failed to subscribe. Please verify your email and try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="container mx-auto px-4 pb-20">
            <div className="bg-black rounded-[40px] p-12 md:p-20 text-white relative overflow-hidden text-center space-y-8">
                <div className="relative z-10 max-w-2xl mx-auto space-y-8">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight whitespace-pre-line">
                        {t('newsletterTitle')}
                    </h2>
                    <p className="text-gray-400 font-medium text-lg max-w-lg mx-auto">
                        {t('newsletterSubtitle')}
                    </p>

                    {success ? (
                        <div className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-3xl animate-in fade-in zoom-in-95 duration-500 max-w-md mx-auto space-y-4">
                            <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                            <div className="space-y-1">
                                <h3 className="font-bold text-lg text-white">Successfully Subscribed!</h3>
                                <p className="text-gray-400 text-sm">Thank you for joining our newsletter list.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
                            {/* Honeypot field for spam protection */}
                            <div className="hidden" aria-hidden="true">
                                <input
                                    type="text"
                                    name="website"
                                    value={honeypot}
                                    onChange={(e) => setHoneypot(e.target.value)}
                                    tabIndex={-1}
                                    autoComplete="off"
                                />
                            </div>

                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1 group">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 group-focus-within:text-white transition-colors" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={t('emailPlaceholder')}
                                        className="w-full bg-white/10 border border-white/20 rounded-full pl-14 pr-6 h-14 outline-none focus:ring-2 focus:ring-white/30 focus:border-white transition-all font-medium text-white placeholder-gray-500"
                                        disabled={loading}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{ '--hover-color': primaryColor } as any}
                                    className="bg-white text-black px-10 h-14 rounded-full font-black text-sm uppercase tracking-widest hover:bg-[var(--hover-color)] hover:text-white transition-colors duration-300 disabled:bg-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        t('subscribe')
                                    )}
                                </button>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-red-400 justify-center text-xs font-bold uppercase tracking-wider animate-in slide-in-from-bottom-2 duration-300">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </form>
                    )}
                </div>

                {/* Decorative background glow using store brand color */}
                <div
                    className="absolute -bottom-[50%] -left-[10%] w-[60%] aspect-square rounded-full opacity-20 blur-[100px] pointer-events-none"
                    style={{ backgroundColor: primaryColor }}
                />
            </div>
        </section>
    );
}
