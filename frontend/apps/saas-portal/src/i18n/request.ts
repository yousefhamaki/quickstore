import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

const locales = ['en', 'ar'];

export default getRequestConfig(async ({ requestLocale }) => {
    const locale = await requestLocale;

    // Validate that the incoming `locale` parameter is valid
    if (!locale || !locales.includes(locale as any)) {
        notFound();
    }

    const baseMessages = locale === 'ar' 
        ? (await import('../../messages/ar.json')).default
        : (await import('../../messages/en.json')).default;

    // Load extra namespace files statically to ensure Turbopack loads them correctly
    let common = {};
    let auth = {};
    let dashboard = {};
    let merchant = {};
    let landing = {};
    let features = {};
    let contact = {};
    let pricing = {};
    let about = {};
    let support = {};
    let privacy = {};
    let terms = {};
    let store = {};

    if (locale === 'ar') {
        try { common = (await import('../../messages/ar/common.json')).default; } catch {}
        try { auth = (await import('../../messages/ar/auth.json')).default; } catch {}
        try { dashboard = (await import('../../messages/ar/dashboard.json')).default; } catch {}
        try { merchant = (await import('../../messages/ar/merchant.json')).default; } catch {}
        try { landing = (await import('../../messages/ar/landing.json')).default; } catch {}
        try { features = (await import('../../messages/ar/features.json')).default; } catch {}
        try { contact = (await import('../../messages/ar/contact.json')).default; } catch {}
        try { pricing = (await import('../../messages/ar/pricing.json')).default; } catch {}
        try { about = (await import('../../messages/ar/about.json')).default; } catch {}
        try { support = (await import('../../messages/ar/support.json')).default; } catch {}
        try { privacy = (await import('../../messages/ar/privacy.json')).default; } catch {}
        try { terms = (await import('../../messages/ar/terms.json')).default; } catch {}
        try { store = (await import('../../messages/ar/store.json')).default; } catch {}
    } else {
        try { common = (await import('../../messages/en/common.json')).default; } catch {}
        try { auth = (await import('../../messages/en/auth.json')).default; } catch {}
        try { dashboard = (await import('../../messages/en/dashboard.json')).default; } catch {}
        try { merchant = (await import('../../messages/en/merchant.json')).default; } catch {}
        try { landing = (await import('../../messages/en/landing.json')).default; } catch {}
        try { features = (await import('../../messages/en/features.json')).default; } catch {}
        try { contact = (await import('../../messages/en/contact.json')).default; } catch {}
        try { pricing = (await import('../../messages/en/pricing.json')).default; } catch {}
        try { about = (await import('../../messages/en/about.json')).default; } catch {}
        try { support = (await import('../../messages/en/support.json')).default; } catch {}
        try { privacy = (await import('../../messages/en/privacy.json')).default; } catch {}
        try { terms = (await import('../../messages/en/terms.json')).default; } catch {}
        try { store = (await import('../../messages/en/store.json')).default; } catch {}
    }

    const mergedMessages = {
        ...baseMessages,
        common: { ...((baseMessages as any).common || {}), ...common },
        auth: { ...((baseMessages as any).auth || {}), ...auth },
        dashboard: { ...((baseMessages as any).dashboard || {}), ...dashboard },
        merchant: { ...((baseMessages as any).merchant || {}), ...merchant },
        landing: { ...((baseMessages as any).landing || {}), ...landing },
        features: { ...((baseMessages as any).features || {}), ...features },
        contact: { ...((baseMessages as any).contact || {}), ...contact },
        pricing: { ...((baseMessages as any).pricing || {}), ...pricing },
        about: { ...((baseMessages as any).about || {}), ...about },
        support: { ...((baseMessages as any).support || {}), ...support },
        privacy: { ...privacy },
        terms: { ...terms },
        store: { ...((baseMessages as any).store || {}), ...store },
    };

    // Spread common and store keys to the root for backwards compatibility
    Object.assign(mergedMessages, common);
    Object.assign(mergedMessages, store);

    return {
        locale,
        messages: mergedMessages
    };
});

