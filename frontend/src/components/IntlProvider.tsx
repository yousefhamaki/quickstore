'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

// List of namespaces to load from messages/[locale]/[namespace].json
const NAMESPACES = [
    'common',
    'auth',
    'dashboard',
    'landing',
    'features',
    'contact',
    'pricing',
    'about',
    'support',
    'privacy',
    'terms'
];

export function IntlProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocale] = useState('en');
    const [messages, setMessages] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Get locale from cookie or default to 'en'
        const cookieLocale = document.cookie
            .split('; ')
            .find(row => row.startsWith('NEXT_LOCALE='))
            ?.split('=')[1] || 'en';

        setLocale(cookieLocale);

        const loadMessages = async (targetLocale: string) => {
            const loadedMessages: any = {};

            try {
                // Load consolidated file first if it exists
                try {
                    const consolidated = await import(`../../messages/${targetLocale}.json`);
                    Object.assign(loadedMessages, consolidated.default || consolidated);
                } catch (e) {
                    console.warn(`Consolidated file for ${targetLocale} not found, skipping...`);
                }

                // Load all individual namespaces
                const namespacePromises = NAMESPACES.map(async (ns) => {
                    try {
                        const msg = await import(`../../messages/${targetLocale}/${ns}.json`);
                        return { ns, data: msg.default || msg };
                    } catch (e) {
                        // Fallback to English if target locale namespace fails
                        if (targetLocale !== 'en') {
                            try {
                                const fallbackMsg = await import(`../../messages/en/${ns}.json`);
                                return { ns, data: fallbackMsg.default || fallbackMsg };
                            } catch (fallbackError) {
                                console.error(`Failed to load namespace ${ns} for both ${targetLocale} and en`);
                                return null;
                            }
                        }
                        return null;
                    }
                });

                const results = await Promise.all(namespacePromises);
                results.forEach(result => {
                    if (result) {
                        loadedMessages[result.ns] = result.data;
                    }
                });

                setMessages(loadedMessages);
            } catch (error) {
                console.error('Initial translation load failed:', error);
                // Last resort fallback
                if (targetLocale !== 'en') {
                    loadMessages('en');
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadMessages(cookieLocale);

        // Update HTML attributes
        const isRTL = cookieLocale === 'ar';
        document.documentElement.lang = cookieLocale;
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';

        // Update font class
        if (isRTL) {
            document.body.classList.remove('font-inter');
            document.body.classList.add('font-cairo');
        } else {
            document.body.classList.remove('font-cairo');
            document.body.classList.add('font-inter');
        }
    }, []);

    if (isLoading || !messages) {
        return (
            <div className="flex flex-col items-center justify-center min-vh-screen min-h-[100vh] bg-white">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium tracking-tight">Building your experience...</p>
            </div>
        );
    }

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
        </NextIntlClientProvider>
    );
}
