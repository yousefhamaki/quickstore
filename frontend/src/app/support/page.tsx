'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { Search, BookOpen, MessageCircle, PlayCircle, HelpCircle, FileText, Ticket } from 'lucide-react';

export default function SupportPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />

            <main className="flex-grow pt-32 pb-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
                    <Badge className="mb-4 bg-blue-50 text-blue-600 border-blue-100 px-4 py-1.5 rounded-full text-sm font-black">
                        SUPPORT CENTER
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-8">
                        How can we <span className="text-blue-600">help?</span>
                    </h1>
                    <div className="max-w-2xl mx-auto relative group mb-8">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 h-6 w-6 group-focus-within:text-blue-600 transition-colors" />
                        <Input
                            placeholder="Search for articles, guides, and tutorials..."
                            className="h-18 pl-16 rounded-[2rem] border-2 border-gray-100 bg-gray-50 text-lg font-medium focus:bg-white transition-all shadow-sm focus:shadow-xl focus:border-blue-500"
                        />
                    </div>
                    <div className="flex justify-center">
                        <a
                            href="/support/status"
                            className="inline-flex items-center gap-2 text-blue-600 font-black hover:bg-blue-50 px-6 py-3 rounded-2xl transition-all"
                        >
                            <Ticket className="h-5 w-5" />
                            Already have a ticket? Check status
                        </a>
                    </div>
                </div>

                {/* Support Categories */}
                <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <SupportCategoryCard
                        icon={<BookOpen className="h-10 w-10 text-blue-500" />}
                        title="Getting Started"
                        description="New to Buildora? Learn the basics of setting up your first store."
                        linkCount={12}
                    />
                    <SupportCategoryCard
                        icon={<PlayCircle className="h-10 w-10 text-purple-500" />}
                        title="Video Tutorials"
                        description="Watch step-by-step guides on managing products and orders."
                        linkCount={8}
                    />
                    <SupportCategoryCard
                        icon={<MessageCircle className="h-10 w-10 text-green-500" />}
                        title="Payment Setup"
                        description="Learn how to configure Instapay and VCash for your store."
                        linkCount={15}
                    />
                    <SupportCategoryCard
                        icon={<FileText className="h-10 w-10 text-orange-500" />}
                        title="Store Design"
                        description="Customize your storefront to match your brand identity."
                        linkCount={20}
                    />
                    <SupportCategoryCard
                        icon={<HelpCircle className="h-10 w-10 text-indigo-500" />}
                        title="FAQ"
                        description="Common questions about billing, security, and features."
                        linkCount={25}
                    />
                    <SupportCategoryCard
                        icon={<Search className="h-10 w-10 text-pink-500" />}
                        title="SEO & Marketing"
                        description="Tips on how to get more traffic and sales for your store."
                        linkCount={10}
                    />
                </div>

                {/* Popular Articles */}
                <div className="max-w-7xl mx-auto px-4 mt-32">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 mb-2">Popular Articles</h2>
                            <p className="text-gray-500 font-medium">Commonly read guides by our merchants.</p>
                        </div>
                        <button className="text-blue-600 font-black flex items-center hover:underline">
                            View All Articles
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ArticleLink title="How to verify Instapay receipts" description="A complete guide on the activation workflow for local payments." />
                        <ArticleLink title="Connecting a custom domain" description="Step-by-step instructions for popular domain registrars." />
                        <ArticleLink title="Managing product variants" description="How to add sizes, colors, and different stock levels." />
                        <ArticleLink title="Setting up shipping rates" description="Configure zones and prices for different Egyptian governorates." />
                    </div>
                </div>

                {/* Contact Support CTA */}
                <div className="max-w-7xl mx-auto px-4 mt-40">
                    <div className="bg-blue-600 rounded-[3rem] p-16 text-center text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-4xl font-black mb-4">Still need help?</h2>
                            <p className="text-xl text-blue-100 font-medium mb-10 max-w-xl mx-auto">
                                Can't find what you're looking for? Our support team is available 24/7 to assist you.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                                <button className="h-14 px-10 rounded-2xl bg-white text-blue-600 font-black text-lg hover:bg-blue-50 transition-colors">
                                    Contact Support
                                </button>
                                <button className="h-14 px-10 rounded-2xl bg-blue-700 text-white font-black text-lg hover:bg-blue-800 transition-colors">
                                    Chat with us
                                </button>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

function SupportCategoryCard({ icon, title, description, linkCount }: {
    icon: React.ReactNode,
    title: string,
    description: string,
    linkCount: number
}) {
    return (
        <div className="p-10 rounded-[2.5rem] border border-gray-100 bg-white hover:border-blue-500 hover:shadow-2xl transition-all duration-300 group">
            <div className="mb-8 bg-gray-50 w-20 h-20 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                {icon}
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">{title}</h3>
            <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                {description}
            </p>
            <p className="text-blue-600 font-black uppercase text-xs tracking-widest">
                {linkCount} Articles
            </p>
        </div>
    );
}

function ArticleLink({ title, description }: { title: string, description: string }) {
    return (
        <div className="p-6 rounded-2xl border border-gray-50 hover:border-blue-200 hover:bg-blue-50/10 transition-all cursor-pointer group">
            <h4 className="text-lg font-black text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{title}</h4>
            <p className="text-gray-500 font-medium text-sm">{description}</p>
        </div>
    );
}
