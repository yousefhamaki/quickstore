'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';

export function Footer() {
    return (
        <footer className="bg-gray-900 text-white py-20 mt-auto">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-gray-800 pb-20 mb-10">
                <div className="space-y-6 md:col-span-2">
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center">
                            <ShoppingCart className="text-white h-6 w-6" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter">BUILDORA</span>
                    </Link>
                    <p className="text-gray-400 max-w-md font-medium leading-relaxed">
                        Empowering the next generation of Egyptian entrepreneurs with professional, reliable, and accessible e-commerce technology.
                    </p>
                </div>
                <div className="space-y-4">
                    <h4 className="font-black uppercase text-xs tracking-widest text-blue-500">Platform</h4>
                    <ul className="space-y-2 text-gray-400 font-medium">
                        <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                        <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                        <li><Link href="/support" className="hover:text-white transition-colors">Support</Link></li>
                        <li><Link href="/auth/register" className="hover:text-white transition-colors">Register</Link></li>
                    </ul>
                </div>
                <div className="space-y-4">
                    <h4 className="font-black uppercase text-xs tracking-widest text-blue-500">Company</h4>
                    <ul className="space-y-2 text-gray-400 font-medium">
                        <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                        <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                        <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                        <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                    </ul>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm font-bold">
                <p>© 2026 Buildora powered by QuickStore. All rights reserved.</p>
                <div className="flex space-x-8 mt-4 md:mt-0">
                    <p>Made with ❤️ for merchants in Egypt</p>
                </div>
            </div>
        </footer>
    );
}
