'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export default function TermsPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <main className="flex-grow pt-32 pb-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Badge className="mb-4 bg-blue-50 text-blue-600 border-blue-100 px-4 py-1.5 rounded-full text-sm font-black">
                        LEGAL
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-12">Terms of Service</h1>

                    <div className="prose prose-blue max-w-none space-y-8 text-gray-600 font-medium leading-relaxed">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-black text-gray-900">1. Acceptance of Terms</h2>
                            <p>
                                By accessing or using QuickStore, you agree to be bound by these Terms of Service. If you do not agree, you may not use our platform.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-black text-gray-900">2. Description of Service</h2>
                            <p>
                                QuickStore provides a multi-tenant SaaS platform for merchants to create and manage online stores, specifically optimized for the Egyptian market.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-black text-gray-900">3. Merchant Responsibilities</h2>
                            <p>
                                As a merchant, you are responsible for:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Providing accurate information during registration.</li>
                                <li>Maintaining the security of your account.</li>
                                <li>Complying with local laws and regulations regarding sales and taxes.</li>
                                <li>Verifying customer payments (Instapay/VCash) accurately before fulfilling orders.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-black text-gray-900">4. Payments and Fees</h2>
                            <p>
                                Subscription fees are billed monthly or annually as per your chosen plan. QuickStore may also charge transaction fees per order as specified in your plan details.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-black text-gray-900">5. Limitation of Liability</h2>
                            <p>
                                QuickStore is not liable for any disputes between merchants and their customers. We provide the tools, but the business transaction is between the merchant and the end-buyer.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
