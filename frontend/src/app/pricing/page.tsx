'use client';

import React from 'react';
import Link from 'next/link';
import { Check, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { usePlans } from '@/lib/hooks/usePlans';

export default function PricingPage() {
    const { data: plans, isLoading } = usePlans();

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />

            <main className="flex-grow pt-32 pb-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-20">
                    <Badge className="mb-4 bg-blue-50 text-blue-600 border-blue-100 px-4 py-1.5 rounded-full text-sm font-black">
                        SIMPLE TRANSPARENT PRICING
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6">
                        Everything you need,<br />
                        <span className="text-blue-600">at a fair price.</span>
                    </h1>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
                        No hidden fees. No surprises. Choose the plan that fits your business scale.
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {plans?.map((plan) => (
                            <PricingCard
                                key={plan._id}
                                id={plan._id}
                                name={plan.name}
                                price={`EGP ${plan.monthlyPrice}`}
                                description={plan.monthlyPrice === 0 ? "Perfect for new brands." : "Unlock more power."}
                                featured={plan.name === 'Pro'}
                                features={[
                                    `${plan.storeLimit === -1 ? 'Unlimited' : plan.storeLimit} Store${plan.storeLimit !== 1 ? 's' : ''}`,
                                    `${plan.productLimit === -1 ? 'Unlimited' : plan.productLimit} Products`,
                                    "Unlimited Orders",
                                    plan.features.customDomain ? "Custom Domain" : "Buildora Subdomain",
                                    plan.features.dropshipping ? "Dropshipping Support" : "Standard Inventory",
                                    `${plan.orderFee} EGP Order Fee`
                                ]}
                            />
                        ))}
                    </div>
                )}

                {/* FAQ Section */}
                <div className="max-w-3xl mx-auto px-4 mt-32">
                    <h2 className="text-3xl font-black text-center mb-12">Frequently Asked Questions</h2>
                    <div className="space-y-8">
                        <FAQItem
                            question="Can I upgrade or downgrade anytime?"
                            answer="Yes, you can change your plan at any time. If you upgrade, the new features will be available immediately."
                        />
                        <FAQItem
                            question="Is there a free trial?"
                            answer="We offer a 14-day free trial with no credit card required. Try all features before you commit."
                        />
                        <FAQItem
                            question="What payment methods do you accept?"
                            answer="We accept Instapay, VCash, and Fawry for all our subscription plans to make it easy for Egyptian merchants."
                        />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

function PricingCard({ id, name, price, description, features, featured = false }: {
    id: string,
    name: string,
    price: string,
    description: string,
    features: string[],
    featured?: boolean
}) {
    return (
        <div className={`relative p-10 rounded-3xl border ${featured ? 'border-blue-500 shadow-2xl scale-105 z-10' : 'border-gray-100'} bg-white group hover:border-blue-500 transition-all duration-300 flex flex-col`}>
            {featured && (
                <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white border-0 px-4 py-1 font-black">
                    MOST POPULAR
                </Badge>
            )}
            <div className="mb-8 text-center">
                <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-widest">{name}</h3>
                <p className="text-gray-500 text-sm font-medium">{description}</p>
            </div>
            <div className="mb-8 text-center">
                <span className="text-5xl font-black text-gray-900">{price}</span>
                <span className="text-gray-400 font-bold">/mo</span>
            </div>
            <div className="space-y-4 mb-10 flex-grow">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-center space-x-3">
                        <div className="h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Check className="h-3 w-3 text-blue-600 stroke-[3px]" />
                        </div>
                        <span className="text-gray-600 font-medium">{feature}</span>
                    </div>
                ))}
            </div>
            <Link href={`/auth/register?planId=${id}`}>
                <Button className={`w-full h-14 rounded-2xl text-lg font-black transition-all ${featured ? 'bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200' : 'bg-gray-900 hover:bg-black'}`}>
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            </Link>
        </div>
    );
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
    return (
        <div className="space-y-2">
            <h3 className="text-lg font-black text-gray-900">{question}</h3>
            <p className="text-gray-500 font-medium leading-relaxed">{answer}</p>
        </div>
    );
}
