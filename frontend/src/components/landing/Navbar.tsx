'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Navbar() {
    return (
        <nav className="fixed top-0 w-full z-50 glass border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <Link href="/" className="flex items-center space-x-2 group">
                        <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                            <ShoppingCart className="text-white h-6 w-6" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-gray-900">QUICKSTORE</span>
                    </Link>
                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="/features" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">Features</Link>
                        <Link href="/pricing" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">Pricing</Link>
                        <Link href="/about" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">About Us</Link>
                        <Link href="/contact" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">Contact</Link>
                        <Link href="/auth/login" className="text-sm font-bold text-gray-900">Sign In</Link>
                        <Link href="/auth/register">
                            <Button className="bg-blue-600 hover:bg-blue-700 rounded-full px-6 font-bold shadow-lg shadow-blue-200">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
