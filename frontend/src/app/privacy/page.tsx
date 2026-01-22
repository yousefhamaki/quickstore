'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export default function PrivacyPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <main className="flex-grow pt-32 pb-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Badge className="mb-4 bg-blue-50 text-blue-600 border-blue-100 px-4 py-1.5 rounded-full text-sm font-black">
                        LEGAL
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-12">Privacy Policy</h1>

                    <div className="prose prose-blue max-w-none space-y-8 text-gray-600 font-medium leading-relaxed">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-black text-gray-900">1. Data Collection</h2>
                            <p>
                                We collect personal information that you provide to us, such as your name, email address, and store details. We also collect device and usage data automatically when you interact with our platform.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-black text-gray-900">2. How We Use Your Data</h2>
                            <p>
                                Your data is used to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Provide and maintain the QuickStore service.</li>
                                <li>Process your subscription payments.</li>
                                <li>Communicate with you regarding account updates.</li>
                                <li>Improve our platform functionality.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-black text-gray-900">3. Customer Data</h2>
                            <p>
                                QuickStore processes customer data on behalf of merchants. Merchants remain the data controllers for their own customer information. We do not sell customer data to third parties.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-black text-gray-900">4. Security</h2>
                            <p>
                                We implement industry-standard security measures to protect your information. However, no method of transmission over the internet is 100% secure.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-black text-gray-900">5. Your Rights</h2>
                            <p>
                                You have the right to access, correct, or delete your personal information. Contact us at privacy@quickstore.eg for any data-related requests.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
