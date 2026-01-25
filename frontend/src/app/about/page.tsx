'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { ShoppingCart, Users, Heart, Target } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />

            <main className="flex-grow pt-32 pb-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-24">
                    <Badge className="mb-4 bg-blue-50 text-blue-600 border-blue-100 px-4 py-1.5 rounded-full text-sm font-black">
                        OUR STORY
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6">
                        Empowering Egyptian<br />
                        <span className="text-blue-600">entrepreneurship.</span>
                    </h1>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed">
                        Buildora was born from a simple observation: Egyptian merchants need better tools to sell online that understand local payment habits.
                    </p>
                </div>

                {/* Mission / Vision */}
                <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 mb-40">
                    <div className="p-12 rounded-[2.5rem] bg-blue-600 text-white space-y-6">
                        <Target className="h-12 w-12 text-blue-200" />
                        <h2 className="text-3xl font-black">Our Mission</h2>
                        <p className="text-blue-100 text-lg font-medium leading-relaxed">
                            To provide accessible, high-performance technology that enables anyone in Egypt to start and scale a professional e-commerce brand without technical barriers.
                        </p>
                    </div>
                    <div className="p-12 rounded-[2.5rem] bg-gray-900 text-white space-y-6">
                        <Heart className="h-12 w-12 text-pink-400" />
                        <h2 className="text-3xl font-black">Our Values</h2>
                        <p className="text-gray-400 text-lg font-medium leading-relaxed">
                            We believe in merchant success above all. We value simplicity, reliability, and local innovation that serves the unique needs of our community.
                        </p>
                    </div>
                </div>

                {/* Story Content */}
                <div className="max-w-4xl mx-auto px-4 space-y-12">
                    <div className="flex items-start space-x-6">
                        <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                            <ShoppingCart className="text-blue-600" />
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-2xl font-black text-gray-900">Why Buildora?</h3>
                            <p className="text-gray-500 text-lg font-medium leading-relaxed">
                                Global platforms often ignore the nuances of the Egyptian market. We focus specifically on local payment methods like Instapay, VCash, and Fawry, and build workflows that actually match how business is done here.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-6">
                        <div className="h-12 w-12 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="text-green-600" />
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-2xl font-black text-gray-900">Community Driven</h3>
                            <p className="text-gray-500 text-lg font-medium leading-relaxed">
                                We are not just a software provider; we are a partner in your growth. Our team works closely with local merchants to identify the features they need most and build them into the platform.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="max-w-7xl mx-auto px-4 mt-40">
                    <div className="bg-gray-50 rounded-[3rem] p-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <p className="text-4xl font-black text-blue-600 mb-2">500+</p>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Merchants</p>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-blue-600 mb-2">10k+</p>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Products Sold</p>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-blue-600 mb-2">99.9%</p>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Uptime</p>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-blue-600 mb-2">24/7</p>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Support</p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
