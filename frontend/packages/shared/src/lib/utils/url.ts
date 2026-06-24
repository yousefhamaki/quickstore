export const getStorefrontOfferUrl = (subdomain: string, campaignId: string) => {
    if (typeof window === 'undefined') {
        const baseDomain = process.env.NEXT_PUBLIC_STORE_BASE_DOMAIN || 'quickstore.live';
        return `https://${subdomain}.${baseDomain}/offers/${campaignId}`;
    }
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        // Storefront runs on port 3000 in dev, dashboard runs on 3001
        return `${protocol}//${subdomain}.localhost:3000/offers/${campaignId}`;
    }
    
    const domainParts = host.split('.');
    // If it's a subdomain of quickstore.live / quickstore.com / quickstore.test
    const baseDomain = domainParts.slice(-2).join('.');
    return `${protocol}//${subdomain}.${baseDomain}/offers/${campaignId}`;
};
