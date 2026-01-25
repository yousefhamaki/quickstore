'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => setIsOpen(!isOpen);

    const navLinks = [
        { href: '/features', label: 'Features' },
        { href: '/pricing', label: 'Pricing' },
        { href: '/about', label: 'About Us' },
        { href: '/contact', label: 'Contact' },
        { href: '/support', label: 'Support' },
    ];

    return (
        <nav className="fixed top-0 w-full z-50 glass border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <Link href="/" className="flex items-center space-x-2 group">
                        <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                            <ShoppingCart className="text-white h-6 w-6" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-gray-900">BUILDORA</span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                            <Link key={link.href} href={link.href} className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">
                                {link.label}
                            </Link>
                        ))}
                        <Link href="/auth/login" className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors">Sign In</Link>
                        <Link href="/auth/register">
                            <Button className="bg-blue-600 hover:bg-blue-700 rounded-full px-6 font-bold shadow-lg shadow-blue-200">
                                Get Started
                            </Button>
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex md:hidden items-center">
                        <button
                            onClick={toggleMenu}
                            className="text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none"
                            aria-label="Toggle menu"
                        >
                            {isOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isOpen && (
                <div className="md:hidden glass border-t animate-in slide-in-from-top duration-300">
                    <div className="px-4 py-6 space-y-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="block text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="pt-4 border-t border-gray-100 flex flex-col space-y-4">
                            <Link
                                href="/auth/login"
                                className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                Sign In
                            </Link>
                            <Link href="/auth/register" onClick={() => setIsOpen(false)}>
                                <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 rounded-2xl font-black text-lg shadow-lg shadow-blue-200">
                                    Get Started
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
