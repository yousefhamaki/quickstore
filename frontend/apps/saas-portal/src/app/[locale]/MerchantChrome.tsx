'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@shared/context/AuthContext';
import { isStorefrontPath } from '@shared/lib/routing';
import { ChatbotWidget } from '@shared/components/chat/ChatbotWidgetLazy';
import { Providers } from './providers';

/**
 * Gates the merchant-only chrome — AuthProvider, Providers (react-query,
 * WalletProvider, NavigationProvider, Google OAuth), and the "Buildora
 * Support" chatbot — out of the public storefront.
 *
 * The root layout wraps EVERY route under [locale], including a merchant's
 * own branded storefront at /store/[subdomain]. Without this gate, every
 * shopper's page load mounted all of that merchant-portal chrome for no
 * reason:
 *  - An unrelated "Buildora Support" chat bubble appeared on someone else's
 *    branded store (ChatbotWidget is addressed to Buildora's own merchant
 *    customers, not a merchant's shoppers — see ChatbotWidget.tsx).
 *  - ChatbotWidget is loaded via next/dynamic({ ssr: false }) (to keep its
 *    ~400-line bundle out of every route's initial JS — see
 *    ChatbotWidgetLazy.tsx's own doc comment), which forces Next to bail
 *    the whole Suspense boundary it's rendered in to client-side rendering
 *    on every single storefront page load — pure SSR waste for a widget
 *    that was never going to render there anyway.
 *  - Wasted client bundle weight (react-query, Wallet polling, Google
 *    OAuth) shipped to anonymous shoppers who never use any of it.
 *
 * Confirmed via grep before writing this: no merchant-portal-only hook
 * (useAuth, useWallet, useQuery/useMutation, Google OAuth) is used anywhere
 * under app/[locale]/store — the storefront has its own separate
 * customer-facing auth/cart mechanisms.
 */
export function MerchantChrome({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    if (isStorefrontPath(pathname)) {
        return <>{children}</>;
    }

    return (
        <AuthProvider>
            <Providers>
                {children}
                <ChatbotWidget />
            </Providers>
        </AuthProvider>
    );
}
