'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';

// Core namespaces loaded immediately
const CORE_NAMESPACES = [
    'common',
    'auth',
    'dashboard',
    'merchant',
    'landing',
    'features',
    'contact',
    'pricing',
    'about',
    'support'
];

// Lazy-loaded namespaces (loaded on demand)
const LAZY_NAMESPACES = [
    'privacy',
    'terms',
    'store'
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
                // Load ONLY core namespaces initially for faster render
                const corePromises = CORE_NAMESPACES.map(async (ns) => {
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
                                console.error(`Failed to load core namespace ${ns}`);
                                return null;
                            }
                        }
                        return null;
                    }
                });

                const coreResults = await Promise.all(corePromises);
                coreResults.forEach(result => {
                    if (result) {
                        loadedMessages[result.ns] = result.data;
                        // For 'common', also spread its keys to the root for better compatibility
                        if (result.ns === 'common') {
                            Object.assign(loadedMessages, result.data);
                        }
                    }
                });

                setMessages(loadedMessages);
                setIsLoading(false);

                // Load lazy namespaces in the background (non-blocking)
                setTimeout(() => {
                    const lazyPromises = LAZY_NAMESPACES.map(async (ns) => {
                        try {
                            const msg = await import(`../../messages/${targetLocale}/${ns}.json`);
                            return { ns, data: msg.default || msg };
                        } catch (e) {
                            if (targetLocale !== 'en') {
                                try {
                                    const fallbackMsg = await import(`../../messages/en/${ns}.json`);
                                    return { ns, data: fallbackMsg.default || fallbackMsg };
                                } catch {
                                    return null;
                                }
                            }
                            return null;
                        }
                    });

                    Promise.all(lazyPromises).then(lazyResults => {
                        // Create a NEW object to trigger state update
                        const updatedMessages = { ...loadedMessages };
                        lazyResults.forEach(result => {
                            if (result) {
                                updatedMessages[result.ns] = result.data;
                                // Also spread store into root if loaded
                                if (result.ns === 'store') {
                                    Object.assign(updatedMessages, result.data);
                                }
                            }
                        });
                        setMessages(updatedMessages);
                    });
                }, 100); // Load after 100ms

            } catch (error) {
                console.error('Initial translation load failed:', error);
                // Last resort fallback
                if (targetLocale !== 'en') {
                    loadMessages('en');
                } else {
                    setIsLoading(false);
                }
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
            <div className="flex flex-col items-center justify-center min-vh-screen min-h-[100vh] bg-background">
                <div className="relative">
                    <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse" />
                    <Loader2 className="h-10 w-10 text-primary animate-spin mb-4 relative z-10" />
                </div>
                <p className="text-muted-foreground font-medium tracking-tight animate-pulse">Building Buildora...</p>
            </div>
        );
    }

    return (
        <NextIntlClientProvider
            locale={locale}
            messages={messages}
            onError={(error) => {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('Translation Error:', error);
                }
            }}
            getMessageFallback={({ namespace, key }) => {
                return key.split('.').pop() || key;
            }}
        >
            <div className="transition-opacity duration-500 animate-in fade-in">
                {children}
            </div>
        </NextIntlClientProvider>
    );
}
