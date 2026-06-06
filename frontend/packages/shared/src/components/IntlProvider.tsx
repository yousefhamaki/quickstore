'use client';

import { NextIntlClientProvider } from 'next-intl';

export function IntlProvider({
    children,
    locale,
    messages
}: {
    children: React.ReactNode;
    locale: string;
    messages: any;
}) {
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
