/**
 * SEO Helper Utilities
 * Production-ready helpers for generating SEO metadata
 * Shopify-level SEO best practices
 */

/**
 * Generate optimized meta title
 * Ensures title is within optimal length (50-60 characters)
 */
export function generateMetaTitle(
    title: string,
    storeName: string,
    options: {
        includeStoreName?: boolean;
        maxLength?: number;
    } = {}
): string {
    const { includeStoreName = true, maxLength = 60 } = options;

    let metaTitle = title.trim();

    // Add store name if requested and not already included
    if (includeStoreName && !metaTitle.toLowerCase().includes(storeName.toLowerCase())) {
        metaTitle = `${metaTitle} | ${storeName}`;
    }

    // Truncate if too long
    if (metaTitle.length > maxLength) {
        metaTitle = metaTitle.substring(0, maxLength - 3) + '...';
    }

    return metaTitle;
}

/**
 * Generate optimized meta description
 * Ensures description is within optimal length (150-160 characters)
 */
export function generateMetaDescription(
    description: string,
    options: {
        maxLength?: number;
    } = {}
): string {
    const { maxLength = 160 } = options;

    let metaDescription = description.trim();

    // Remove HTML tags if any
    metaDescription = metaDescription.replace(/<[^>]*>/g, '');

    // Truncate if too long
    if (metaDescription.length > maxLength) {
        metaDescription = metaDescription.substring(0, maxLength - 3) + '...';
    }

    return metaDescription;
}

/**
 * Generate product meta title with smart defaults
 */
export function generateProductTitle(product: any, storeName: string): string {
    // Priority: custom SEO title > product name
    const title = product.seo?.title || product.name;

    // Add price if available
    const hasPrice = product.price > 0;
    const priceText = hasPrice ? ` - EGP ${product.price.toLocaleString()}` : '';

    return generateMetaTitle(`${title}${priceText}`, storeName);
}

/**
 * Generate product meta description with smart defaults
 */
export function generateProductDescription(product: any): string {
    // Priority: custom SEO description > short description > full description
    const description =
        product.seo?.description ||
        product.shortDescription ||
        product.description ||
        `Buy ${product.name} online`;

    return generateMetaDescription(description);
}

/**
 * Generate product keywords
 */
export function generateProductKeywords(product: any): string[] {
    const keywords: string[] = [];

    // Add custom SEO keywords
    if (product.seo?.keywords && product.seo.keywords.length > 0) {
        keywords.push(...product.seo.keywords);
    }

    // Add product tags
    if (product.tags && product.tags.length > 0) {
        keywords.push(...product.tags);
    }

    // Add category
    if (product.category) {
        keywords.push(product.category);
    }

    // Add product name words (if not already included)
    const nameWords = product.name.toLowerCase().split(' ').filter((word: string) => word.length > 3);
    nameWords.forEach((word: string) => {
        if (!keywords.some(k => k.toLowerCase().includes(word))) {
            keywords.push(word);
        }
    });

    // Remove duplicates and limit to 10
    return [...new Set(keywords)].slice(0, 10);
}

/**
 * Generate canonical URL
 */
export function generateCanonicalUrl(
    path: string,
    store: {
        domain: {
            subdomain: string;
            customDomain?: string;
            isCustomDomainVerified?: boolean;
        };
    }
): string {
    const baseUrl = store.domain.customDomain && store.domain.isCustomDomainVerified
        ? `https://${store.domain.customDomain}`
        : `https://${store.domain.subdomain}.quickstore.live`;

    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    return `${baseUrl}${cleanPath}`;
}

/**
 * Generate Open Graph image URL
 * Falls back to store logo or default image
 */
export function generateOgImage(
    images: { url: string }[] | undefined,
    storeLogo?: { url: string }
): string | undefined {
    if (images && images.length > 0) {
        return images[0].url;
    }

    if (storeLogo) {
        return storeLogo.url;
    }

    // Could return a default OG image here
    return undefined;
}

/**
 * Validate and sanitize meta title
 */
export function sanitizeMetaTitle(title: string): string {
    return title
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}

/**
 * Validate and sanitize meta description
 */
export function sanitizeMetaDescription(description: string): string {
    return description
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/[<>]/g, '') // Remove angle brackets
        .trim();
}

/**
 * Check if title length is optimal
 */
export function isTitleOptimal(title: string): {
    isOptimal: boolean;
    length: number;
    recommendation: string;
} {
    const length = title.length;

    if (length < 30) {
        return {
            isOptimal: false,
            length,
            recommendation: 'Title is too short. Aim for 50-60 characters.'
        };
    }

    if (length > 60) {
        return {
            isOptimal: false,
            length,
            recommendation: 'Title is too long. Keep it under 60 characters.'
        };
    }

    return {
        isOptimal: true,
        length,
        recommendation: 'Title length is optimal!'
    };
}

/**
 * Check if description length is optimal
 */
export function isDescriptionOptimal(description: string): {
    isOptimal: boolean;
    length: number;
    recommendation: string;
} {
    const length = description.length;

    if (length < 70) {
        return {
            isOptimal: false,
            length,
            recommendation: 'Description is too short. Aim for 150-160 characters.'
        };
    }

    if (length > 160) {
        return {
            isOptimal: false,
            length,
            recommendation: 'Description is too long. Keep it under 160 characters.'
        };
    }

    return {
        isOptimal: true,
        length,
        recommendation: 'Description length is optimal!'
    };
}
