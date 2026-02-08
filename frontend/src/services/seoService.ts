/**
 * SEO Service
 * API service for SEO Center operations
 */

import { SEOSettings, SEOHealth, ProductSEO, UpdateSEOSettingsPayload, UpdateProductSEOPayload } from '@/types/seo';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Get SEO settings for a store
 */
export async function getSEOSettings(storeId: string, token: string): Promise<SEOSettings> {
    const response = await fetch(`${API_BASE}/stores/${storeId}/seo/settings`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch SEO settings');
    }

    const data = await response.json();
    return data.settings;
}

/**
 * Update SEO settings for a store
 */
export async function updateSEOSettings(
    storeId: string,
    token: string,
    settings: UpdateSEOSettingsPayload
): Promise<SEOSettings> {
    const response = await fetch(`${API_BASE}/stores/${storeId}/seo/settings`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
    });

    if (!response.ok) {
        throw new Error('Failed to update SEO settings');
    }

    const data = await response.json();
    return data.settings;
}

/**
 * Get SEO health for a store
 */
export async function getSEOHealth(storeId: string, token: string): Promise<SEOHealth> {
    const response = await fetch(`${API_BASE}/seo/health/${storeId}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch SEO health');
    }

    const data = await response.json();
    return data.health;
}

/**
 * Refresh SEO health (force re-check)
 */
export async function refreshSEOHealth(storeId: string, token: string): Promise<SEOHealth> {
    const response = await fetch(`${API_BASE}/seo/health/${storeId}/refresh`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error('Failed to refresh SEO health');
    }

    const data = await response.json();
    return data.health;
}

/**
 * Get products with SEO data
 */
export async function getProductsSEO(storeId: string, token: string): Promise<ProductSEO[]> {
    const response = await fetch(`${API_BASE}/stores/${storeId}/products?includeSEO=true`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch products');
    }

    const data = await response.json();
    return data.products;
}

/**
 * Update product SEO
 */
export async function updateProductSEO(
    storeId: string,
    token: string,
    payload: UpdateProductSEOPayload
): Promise<ProductSEO> {
    const response = await fetch(`${API_BASE}/stores/${storeId}/products/${payload.productId}/seo`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload.seo)
    });

    if (!response.ok) {
        throw new Error('Failed to update product SEO');
    }

    const data = await response.json();
    return data.product;
}
