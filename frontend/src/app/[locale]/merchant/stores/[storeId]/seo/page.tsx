'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { SEOSettings, SEOHealth, ProductSEO } from '@/types/seo';
import {
    getSEOSettings,
    updateSEOSettings,
    getSEOHealth,
    refreshSEOHealth,
    getProductsSEO,
    updateProductSEO
} from '@/services/seoService';
import { getStore } from '@/lib/api/stores';
import { GlobalSEOForm } from '@/components/merchant/seo/GlobalSEOForm';
import { SEOHealthDashboard } from '@/components/merchant/seo/SEOHealthDashboard';
import { ProductSEOList } from '@/components/merchant/seo/ProductSEOList';
import { Settings, TrendingUp, FileText, Lock, Loader2 } from 'lucide-react';

interface SEOCenterProps {
    storeId: string;
    storePlan: string; // 'free', 'starter', 'professional', 'enterprise'
}

export default function SEOCenter({ storeId, storePlan }: SEOCenterProps) {
    const { token } = useAuth();

    // State
    const [activeTab, setActiveTab] = useState<'health' | 'global' | 'products' | 'technical'>('health');
    const [settings, setSettings] = useState<SEOSettings | null>(null);
    const [health, setHealth] = useState<SEOHealth | null>(null);
    const [products, setProducts] = useState<ProductSEO[]>([]);
    const [storeData, setStoreData] = useState<any>(null);

    // Loading states
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [loadingHealth, setLoadingHealth] = useState(true);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingStore, setLoadingStore] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [refreshingHealth, setRefreshingHealth] = useState(false);
    const [updatingProduct, setUpdatingProduct] = useState(false);

    // Error states
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Check if feature is available
    const isProfessionalOrHigher = ['professional', 'enterprise'].includes(storePlan.toLowerCase());

    // Fetch data on mount
    useEffect(() => {
        if (isProfessionalOrHigher && token) {
            fetchSettings();
            fetchHealth();
            fetchStoreData();
        }
    }, [storeId, token, isProfessionalOrHigher]);

    const fetchStoreData = async () => {
        try {
            setLoadingStore(true);
            const data = await getStore(storeId);
            setStoreData(data);
        } catch (err) {
            console.error('Failed to fetch store details', err);
        } finally {
            setLoadingStore(false);
        }
    };

    // Fetch products when products tab is active
    useEffect(() => {
        if (activeTab === 'products' && isProfessionalOrHigher && token && products.length === 0) {
            fetchProducts();
        }
    }, [activeTab, isProfessionalOrHigher, token]);

    const fetchSettings = async () => {
        try {
            setLoadingSettings(true);
            setError(null);
            const data = await getSEOSettings(storeId, token!);
            setSettings(data);
        } catch (err) {
            setError('Failed to load SEO settings');
            console.error(err);
        } finally {
            setLoadingSettings(false);
        }
    };

    const fetchHealth = async () => {
        try {
            setLoadingHealth(true);
            setError(null);
            const data = await getSEOHealth(storeId, token!);
            setHealth(data);
        } catch (err) {
            // Health might not exist yet, that's okay
            console.error(err);
        } finally {
            setLoadingHealth(false);
        }
    };

    const fetchProducts = async () => {
        try {
            setLoadingProducts(true);
            setError(null);
            const data = await getProductsSEO(storeId, token!);
            setProducts(data);
        } catch (err) {
            setError('Failed to load products');
            console.error(err);
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleSaveSettings = async (newSettings: SEOSettings) => {
        try {
            setSavingSettings(true);
            setError(null);
            setSuccessMessage(null);
            const updated = await updateSEOSettings(storeId, token!, newSettings);
            setSettings(updated);
            setSuccessMessage('SEO settings saved successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError('Failed to save SEO settings');
            console.error(err);
        } finally {
            setSavingSettings(false);
        }
    };

    const handleRefreshHealth = async () => {
        try {
            setRefreshingHealth(true);
            setError(null);
            const data = await refreshSEOHealth(storeId, token!);
            setHealth(data);
            setSuccessMessage('SEO health refreshed!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError('Failed to refresh SEO health');
            console.error(err);
        } finally {
            setRefreshingHealth(false);
        }
    };

    const handleUpdateProduct = async (productId: string, seo: any) => {
        try {
            setUpdatingProduct(true);
            setError(null);
            await updateProductSEO(storeId, token!, { productId, seo });
            // Update local state
            setProducts(prev =>
                prev.map(p => (p.productId === productId ? { ...p, seo } : p))
            );
            setSuccessMessage('Product SEO updated!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError('Failed to update product SEO');
            console.error(err);
        } finally {
            setUpdatingProduct(false);
        }
    };

    // Plan gate
    if (!isProfessionalOrHigher) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                        <Lock className="text-blue-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">SEO Center</h2>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Advanced SEO tools are available on the Professional plan and above.
                        Optimize your store for search engines and track your SEO health.
                    </p>
                    <div className="space-y-2 mb-6">
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                            <span className="text-green-600">✓</span> Global SEO settings
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                            <span className="text-green-600">✓</span> Product-level SEO optimization
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                            <span className="text-green-600">✓</span> SEO health monitoring
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                            <span className="text-green-600">✓</span> Automatic sitemap generation
                        </div>
                    </div>
                    <a
                        href="/merchant/settings/billing"
                        className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Upgrade to Professional
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">SEO Center</h1>
                <p className="text-gray-600 mt-2">
                    Optimize your store for search engines and track your SEO performance
                </p>
            </div>

            {/* Success/Error Messages */}
            {successMessage && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                    {successMessage}
                </div>
            )}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('health')}
                        className={`${activeTab === 'health'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <TrendingUp size={20} />
                        SEO Health
                    </button>
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`${activeTab === 'global'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <Settings size={20} />
                        Global Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`${activeTab === 'products'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <FileText size={20} />
                        Product SEO
                    </button>
                    <button
                        onClick={() => setActiveTab('technical')}
                        className={`${activeTab === 'technical'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <Settings size={20} />
                        Technical SEO
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {activeTab === 'health' && (
                    <SEOHealthDashboard
                        health={health}
                        loading={loadingHealth}
                        onRefresh={handleRefreshHealth}
                        refreshing={refreshingHealth}
                    />
                )}

                {activeTab === 'global' && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Global SEO Settings</h2>
                        <p className="text-gray-600 mb-6">
                            These settings apply to your entire store and serve as defaults for all pages.
                        </p>
                        {loadingSettings ? (
                            <div className="animate-pulse space-y-4">
                                <div className="h-10 bg-gray-200 rounded"></div>
                                <div className="h-20 bg-gray-200 rounded"></div>
                                <div className="h-10 bg-gray-200 rounded"></div>
                            </div>
                        ) : settings ? (
                            <GlobalSEOForm
                                settings={settings}
                                onSave={handleSaveSettings}
                                saving={savingSettings}
                            />
                        ) : (
                            <p className="text-gray-600">Failed to load settings</p>
                        )}
                    </div>
                )}

                {activeTab === 'products' && (
                    <div>
                        <div className="bg-white rounded-lg shadow p-6 mb-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Product SEO</h2>
                            <p className="text-gray-600">
                                Customize SEO settings for individual products. Leave blank to use product name and description.
                            </p>
                        </div>
                        {loadingProducts ? (
                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="animate-pulse space-y-4">
                                    <div className="h-10 bg-gray-200 rounded"></div>
                                    <div className="h-10 bg-gray-200 rounded"></div>
                                    <div className="h-10 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        ) : (
                            <ProductSEOList
                                products={products}
                                onUpdateProduct={handleUpdateProduct}
                                updating={updatingProduct}
                            />
                        )}
                    </div>
                )}

                {activeTab === 'technical' && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Technical SEO</h2>
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">XML Sitemap</h3>
                                <p className="text-sm text-gray-600 mb-3">
                                    Your sitemap is automatically generated and updated when you add or remove products.
                                </p>
                                <div className="flex items-center gap-4 flex-wrap">
                                    {loadingStore ? (
                                        <div className="flex items-center gap-2 text-gray-400 animate-pulse">
                                            <Loader2 size={14} className="animate-spin" />
                                            <span className="text-xs">Loading store domain...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <code className="px-3 py-2 bg-gray-100 rounded text-sm">
                                                https://{(storeData?.domain?.subdomain || storeData?.slug) || 'yourstore'}.quickstore.live/sitemap.xml
                                            </code>
                                            <a
                                                href={`https://${(storeData?.domain?.subdomain || storeData?.slug) || storeId}.quickstore.live/sitemap.xml`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                                            >
                                                View Sitemap
                                                <span className="text-xs">↗</span>
                                            </a>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Robots.txt</h3>
                                <p className="text-sm text-gray-600 mb-3">
                                    Controls which pages search engines can crawl. Automatically configured based on your settings.
                                </p>
                                <div className="flex items-center gap-4 flex-wrap">
                                    {loadingStore ? (
                                        <div className="flex items-center gap-2 text-gray-400 animate-pulse">
                                            <Loader2 size={14} className="animate-spin" />
                                            <span className="text-xs">Loading store domain...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <code className="px-3 py-2 bg-gray-100 rounded text-sm">
                                                https://{(storeData?.domain?.subdomain || storeData?.slug) || 'yourstore'}.quickstore.live/robots.txt
                                            </code>
                                            <a
                                                href={`https://${(storeData?.domain?.subdomain || storeData?.slug) || storeId}.quickstore.live/robots.txt`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                                            >
                                                View Robots.txt
                                                <span className="text-xs">↗</span>
                                            </a>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Structured Data</h3>
                                <p className="text-sm text-gray-600 mb-3">
                                    JSON-LD structured data is automatically added to your product pages for rich search results.
                                </p>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm text-blue-900">
                                        ✓ Organization schema (sitewide)
                                    </p>
                                    <p className="text-sm text-blue-900">
                                        ✓ Product schema (product pages)
                                    </p>
                                    <p className="text-sm text-blue-900">
                                        ✓ Open Graph tags (all pages)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
