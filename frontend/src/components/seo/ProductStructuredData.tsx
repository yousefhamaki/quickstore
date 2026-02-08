'use client';

/**
 * Product Structured Data (JSON-LD)
 * Implements schema.org Product markup for SEO
 * Helps search engines understand product details
 */

interface ProductStructuredDataProps {
    product: {
        _id: string;
        name: string;
        description: string;
        price: number;
        images: { url: string }[];
        sku?: string;
        category?: string;
        seo?: {
            structuredData?: {
                brand?: string;
                gtin?: string;
                mpn?: string;
                condition?: 'NewCondition' | 'UsedCondition' | 'RefurbishedCondition';
                availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
            };
        };
        inventory?: {
            quantity: number;
        };
        trackInventory?: boolean;
    };
    store: {
        name: string;
        domain: {
            subdomain: string;
            customDomain?: string;
            isCustomDomainVerified?: boolean;
        };
        settings: {
            currency: string;
        };
    };
}

export function ProductStructuredData({ product, store }: ProductStructuredDataProps) {
    // Determine base URL
    const baseUrl = store.domain.customDomain && store.domain.isCustomDomainVerified
        ? `https://${store.domain.customDomain}`
        : `https://${store.domain.subdomain}.quickstore.live`;

    // Determine availability
    let availability = 'https://schema.org/InStock';
    if (product.seo?.structuredData?.availability) {
        availability = `https://schema.org/${product.seo.structuredData.availability}`;
    } else if (product.trackInventory && product.inventory) {
        availability = product.inventory.quantity > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock';
    }

    // Build structured data
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: product.images.map(img => img.url),
        sku: product.sku || product._id,
        brand: {
            '@type': 'Brand',
            name: product.seo?.structuredData?.brand || store.name
        },
        offers: {
            '@type': 'Offer',
            price: product.price.toString(),
            priceCurrency: store.settings.currency || 'EGP',
            availability,
            url: `${baseUrl}/products/${product._id}`,
            seller: {
                '@type': 'Organization',
                name: store.name
            }
        }
    };

    // Add optional fields
    if (product.seo?.structuredData?.gtin) {
        (structuredData as any).gtin = product.seo.structuredData.gtin;
    }

    if (product.seo?.structuredData?.mpn) {
        (structuredData as any).mpn = product.seo.structuredData.mpn;
    }

    if (product.seo?.structuredData?.condition) {
        (structuredData.offers as any).itemCondition = `https://schema.org/${product.seo.structuredData.condition}`;
    }

    if (product.category) {
        (structuredData as any).category = product.category;
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
    );
}
