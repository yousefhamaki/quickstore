'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export function Footer() {
    const t = useTranslations('common');

    return (
        <footer className="bg-gray-900 text-white py-20 mt-auto">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-gray-800 pb-20 mb-10">
                <div className="space-y-6 md:col-span-2">
                    <Link href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="relative h-10 w-10 flex-shrink-0">
                            <Image
                                src="/logo.png"
                                alt="Buildora Logo"
                                width={40}
                                height={40}
                                className="object-contain"
                            />
                        </div>
                        <span className="text-2xl font-black tracking-tighter">{t('brand.name').toUpperCase()}</span>
                    </Link>
                    <p className="text-gray-400 max-w-md font-medium leading-relaxed">
                        Empowering the next generation of Egyptian entrepreneurs with professional, reliable, and accessible e-commerce technology.
                    </p>
                </div>
                <div className="space-y-4">
                    <h4 className="font-black uppercase text-xs tracking-widest text-blue-500">{t('footer.product')}</h4>
                    <ul className="space-y-2 text-gray-400 font-medium">
                        <li><Link href="/features" className="hover:text-white transition-colors">{t('nav.features')}</Link></li>
                        <li><Link href="/pricing" className="hover:text-white transition-colors">{t('nav.pricing')}</Link></li>
                        <li><Link href="/support" className="hover:text-white transition-colors">{t('nav.support')}</Link></li>
                        <li><Link href="/auth/register" className="hover:text-white transition-colors">{t('nav.getStarted')}</Link></li>
                    </ul>
                </div>
                <div className="space-y-4">
                    <h4 className="font-black uppercase text-xs tracking-widest text-blue-500">{t('footer.company')}</h4>
                    <ul className="space-y-2 text-gray-400 font-medium">
                        <li><Link href="/about" className="hover:text-white transition-colors">{t('nav.about')}</Link></li>
                        <li><Link href="/contact" className="hover:text-white transition-colors">{t('nav.contact')}</Link></li>
                        <li><Link href="/privacy" className="hover:text-white transition-colors">{t('footer.privacy')}</Link></li>
                        <li><Link href="/terms" className="hover:text-white transition-colors">{t('footer.terms')}</Link></li>
                    </ul>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm font-bold">
                <p>{t('footer.copyright')}</p>
                <div className="flex space-x-8 rtl:space-x-reverse mt-4 md:mt-0">
                    <p>Made with ❤️ for merchants in Egypt</p>
                </div>
            </div>
        </footer>
    );
}
