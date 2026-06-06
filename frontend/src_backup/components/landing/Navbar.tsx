'use client';

import React, { useState } from 'react';
import { NavLink } from '@/components/NavLink';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const t = useTranslations('common');

    const toggleMenu = () => setIsOpen(!isOpen);

    const navLinks = [
        { href: '/features', label: t('nav.features') },
        { href: '/pricing', label: t('nav.pricing') },
        { href: '/about', label: t('nav.about') },
        { href: '/contact', label: t('nav.contact') },
        { href: '/support', label: t('nav.support') },
    ];

    return (
        <nav className="fixed top-0 w-full z-50 glass border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <NavLink href="/" className="flex items-center space-x-3 rtl:space-x-reverse group">
                        <div className="relative h-10 w-10 flex-shrink-0">
                            <Image
                                src="/logo.png"
                                alt="Buildora Logo"
                                width={100}
                                height={100}
                                className="object-contain group-hover:scale-110 transition-transform duration-300"
                                priority
                                style={{ background: 'transparent' }}
                            />
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-gray-900">{t('brand.name').toUpperCase()}</span>
                    </NavLink>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-8 rtl:space-x-reverse">
                        {navLinks.map((link) => (
                            <NavLink key={link.href} href={link.href} className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">
                                {link.label}
                            </NavLink>
                        ))}
                        <NavLink href="/auth/login" className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors">{t('nav.login')}</NavLink>
                        <NavLink href="/auth/register">
                            <Button className="bg-blue-600 hover:bg-blue-700 rounded-full px-6 font-bold shadow-lg shadow-blue-200">
                                {t('nav.getStarted')}
                            </Button>
                        </NavLink>
                        <LanguageSwitcher />
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex md:hidden items-center gap-2">
                        <LanguageSwitcher />
                        <button
                            onClick={toggleMenu}
                            className="text-gray-900 hover:text-blue-600 transition-colors p-2"
                            aria-label="Toggle menu"
                        >
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden glass border-t">
                    <div className="px-4 pt-4 pb-6 space-y-4">
                        {navLinks.map((link) => (
                            <NavLink
                                key={link.href}
                                href={link.href}
                                className="block text-base font-bold text-gray-500 hover:text-blue-600 transition-colors py-2"
                                onClick={() => setIsOpen(false)}
                            >
                                {link.label}
                            </NavLink>
                        ))}
                        <NavLink
                            href="/auth/login"
                            className="block text-base font-bold text-gray-900 hover:text-blue-600 transition-colors py-2"
                            onClick={() => setIsOpen(false)}
                        >
                            {t('nav.login')}
                        </NavLink>
                        <NavLink href="/auth/register" onClick={() => setIsOpen(false)}>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 rounded-full font-bold shadow-lg shadow-blue-200">
                                {t('nav.getStarted')}
                            </Button>
                        </NavLink>
                    </div>
                </div>
            )}
        </nav>
    );
}

