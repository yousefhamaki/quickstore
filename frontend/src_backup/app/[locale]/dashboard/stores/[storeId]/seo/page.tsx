'use client';

import { use, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
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
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function SEOCenterPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { token } = useAuth();
    const router = useRouter();
    const { checkAccess, getRequiredPlan, isLoading: accessLoading } = useFeatureAccess(undefined, storeId);

    // Check if feature is available
    const hasSEOAccess = checkAccess('seo');

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
    const [backendReady, setBackendReady] = useState(true);

    // Fetch data on mount
    useEffect(() => {
        if (hasSEOAccess && token) {
            fetchSettings();
            fetchHealth();
            fetchStoreData();
        }
    }, [storeId, token, hasSEOAccess]);

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
        if (activeTab === 'products' && hasSEOAccess && token && products.length === 0) {
            fetchProducts();
        }
    }, [activeTab, hasSEOAccess, token]);

    const fetchSettings = async () => {
        try {
            setLoadingSettings(true);
            setError(null);
            const data = await getSEOSettings(storeId, token!);
            setSettings(data);
            setBackendReady(true);
        } catch (err: any) {
            // Check if it's a 404 (endpoint not implemented)
            if (err.message?.includes('Failed to fetch') || err.message?.includes('404')) {
                setBackendReady(false);
                // Set default settings for demo
                setSettings({
                    allowIndexing: true,
                    sitemapEnabled: true,
                });
                // Don't log to console - backend not ready is expected
            } else {
                setError('Failed to load SEO settings');
                console.error(err);
            }
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
            // Health might not exist yet, silently fail
            // Don't log to console to avoid spam
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
            // Backend not ready, silently fail
            if (!backendReady) {
                // Set empty products for demo
                setProducts([]);
            } else {
                setError('Failed to load products');
                console.error(err);
            }
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
            if (!backendReady) {
                // Backend not ready, show helpful message
                setError('Backend API not implemented yet. See the blue banner above for next steps.');
            } else {
                setError('Failed to save SEO settings');
                console.error(err);
            }
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
            if (!backendReady) {
                // Backend not ready, show helpful message
                setError('Backend API not implemented yet. See the blue banner above for next steps.');
            } else {
                setError('Failed to refresh SEO health');
                console.error(err);
            }
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
            if (!backendReady) {
                // Backend not ready, show helpful message
                setError('Backend API not implemented yet. See the blue banner above for next steps.');
            } else {
                setError('Failed to update product SEO');
                console.error(err);
            }
        } finally {
            setUpdatingProduct(false);
        }
    };

    // Loading state
    if (accessLoading) {
        return (
            <div className="p-8 space-y-8 animate-pulse">
                <div className="h-12 w-64 bg-muted rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted rounded-[2.5rem]" />)}
                </div>
            </div>
        );
    }

    // Plan gate
    if (!hasSEOAccess) {
        const requiredPlan = getRequiredPlan('seo');
        return (
            <div className="p-4 md:p-8">
                <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-lg p-12 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-[2rem] mb-6">
                        <Lock className="text-emerald-600" size={40} />
                    </div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic text-primary mb-3">SEO Center</h2>
                    <p className="text-muted-foreground mb-8 max-w-md mx-auto font-medium">
                        Advanced SEO tools are available on the {requiredPlan} plan and above.
                        Optimize your store for search engines and track your SEO health.
                    </p>
                    <div className="space-y-3 mb-8">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium">
                            <span className="text-green-600 text-lg">✓</span> Global SEO settings
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm font-medium">
                            <span className="text-green-600 text-lg">✓</span> Product-level SEO optimization
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm font-medium">
                            <span className="text-green-600 text-lg">✓</span> SEO health monitoring
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm font-medium">
                            <span className="text-green-600 text-lg">✓</span> Automatic sitemap generation
                        </div>
                    </div>
                    <Button
                        size="lg"
                        className="rounded-2xl font-black uppercase tracking-widest text-xs px-8"
                        onClick={() => router.push('/dashboard/billing')}
                    >
                        Upgrade to {requiredPlan}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic text-primary">SEO Center</h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Optimize your store for search engines and track your SEO performance
                    </p>
                </div>
            </div>

            {/* Backend Not Ready Banner */}
            {!backendReady && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Settings className="text-blue-600" size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-black uppercase tracking-tight text-blue-900 mb-2">
                                Backend Integration Required
                            </h3>
                            <p className="text-sm text-blue-800 font-medium mb-3">
                                The SEO Center frontend is ready, but the backend API endpoints need to be implemented.
                                You're currently viewing the UI with demo data.
                            </p>
                            <div className="text-xs text-blue-700 font-medium space-y-1">
                                <p>📋 <strong>Next Steps:</strong></p>
                                <p className="ml-4">1. Implement the 6 required API endpoints (see SEO_CENTER_ARCHITECTURE.md)</p>
                                <p className="ml-4">2. Update Store model with SEO settings</p>
                                <p className="ml-4">3. Add SEOHealth model and service</p>
                                <p className="ml-4">4. Test endpoints and refresh this page</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success/Error Messages */}
            {successMessage && (
                <div className="bg-green-50 border-2 border-green-200 text-green-800 px-6 py-4 rounded-2xl font-medium">
                    {successMessage}
                </div>
            )}
            {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-2xl font-medium">
                    {error}
                </div>
            )}

            {/* Tabs */}
            <div className="border-b-2 border-muted">
                <nav className="-mb-0.5 flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('health')}
                        className={`${activeTab === 'health'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-bold uppercase tracking-wider text-xs flex items-center gap-2 transition-colors`}
                    >
                        <TrendingUp size={18} />
                        SEO Health
                    </button>
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`${activeTab === 'global'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-bold uppercase tracking-wider text-xs flex items-center gap-2 transition-colors`}
                    >
                        <Settings size={18} />
                        Global Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`${activeTab === 'products'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-bold uppercase tracking-wider text-xs flex items-center gap-2 transition-colors`}
                    >
                        <FileText size={18} />
                        Product SEO
                    </button>
                    <button
                        onClick={() => setActiveTab('technical')}
                        className={`${activeTab === 'technical'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-bold uppercase tracking-wider text-xs flex items-center gap-2 transition-colors`}
                    >
                        <Settings size={18} />
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
                    <div className="bg-white rounded-3xl shadow-sm border-2 p-8">
                        <h2 className="text-xl font-black uppercase tracking-tight mb-2">Global SEO Settings</h2>
                        <p className="text-muted-foreground font-medium mb-6">
                            These settings apply to your entire store and serve as defaults for all pages.
                        </p>
                        {loadingSettings ? (
                            <div className="animate-pulse space-y-4">
                                <div className="h-10 bg-muted rounded-2xl"></div>
                                <div className="h-20 bg-muted rounded-2xl"></div>
                                <div className="h-10 bg-muted rounded-2xl"></div>
                            </div>
                        ) : settings ? (
                            <GlobalSEOForm
                                settings={settings}
                                onSave={handleSaveSettings}
                                saving={savingSettings}
                            />
                        ) : (
                            <p className="text-muted-foreground">Failed to load settings</p>
                        )}
                    </div>
                )}

                {activeTab === 'products' && (
                    <div>
                        <div className="bg-white rounded-3xl shadow-sm border-2 p-8 mb-6">
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Product SEO</h2>
                            <p className="text-muted-foreground font-medium">
                                Customize SEO settings for individual products. Leave blank to use product name and description.
                            </p>
                        </div>
                        {loadingProducts ? (
                            <div className="bg-white rounded-3xl shadow-sm border-2 p-8">
                                <div className="animate-pulse space-y-4">
                                    <div className="h-10 bg-muted rounded-2xl"></div>
                                    <div className="h-10 bg-muted rounded-2xl"></div>
                                    <div className="h-10 bg-muted rounded-2xl"></div>
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
                    <div className="bg-white rounded-3xl shadow-sm border-2 p-8">
                        <h2 className="text-xl font-black uppercase tracking-tight mb-6">Technical SEO</h2>
                        <div className="space-y-8">
                            <div>
                                <h3 className="font-bold text-foreground mb-2 uppercase text-sm tracking-wider">XML Sitemap</h3>
                                <p className="text-sm text-muted-foreground font-medium mb-4">
                                    Your sitemap is automatically generated and updated when you add or remove products.
                                </p>
                                <div className="flex items-center gap-4 flex-wrap">
                                    {loadingStore ? (
                                        <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                                            <Loader2 size={16} className="animate-spin" />
                                            <span className="text-sm font-medium">Fetching store domain...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <code className="px-4 py-2 bg-muted rounded-xl text-sm font-mono">
                                                https://{(storeData?.domain?.subdomain || storeData?.slug) || 'yourstore'}.quickstore.live/sitemap.xml
                                            </code>
                                            <a
                                                href={`https://${(storeData?.domain?.subdomain || storeData?.slug) || storeId}.quickstore.live/sitemap.xml`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline text-sm font-bold uppercase tracking-wider flex items-center gap-1"
                                            >
                                                View Sitemap
                                                <span className="text-xs">↗</span>
                                            </a>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-foreground mb-2 uppercase text-sm tracking-wider">Robots.txt</h3>
                                <p className="text-sm text-muted-foreground font-medium mb-4">
                                    Controls which pages search engines can crawl. Automatically configured based on your settings.
                                </p>
                                <div className="flex items-center gap-4 flex-wrap">
                                    {loadingStore ? (
                                        <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                                            <Loader2 size={16} className="animate-spin" />
                                            <span className="text-sm font-medium">Fetching store domain...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <code className="px-4 py-2 bg-muted rounded-xl text-sm font-mono">
                                                https://{(storeData?.domain?.subdomain || storeData?.slug) || 'yourstore'}.quickstore.live/robots.txt
                                            </code>
                                            <a
                                                href={`https://${(storeData?.domain?.subdomain || storeData?.slug) || storeId}.quickstore.live/robots.txt`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline text-sm font-bold uppercase tracking-wider flex items-center gap-1"
                                            >
                                                View Robots.txt
                                                <span className="text-xs">↗</span>
                                            </a>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-foreground mb-2 uppercase text-sm tracking-wider">Structured Data</h3>
                                <p className="text-sm text-muted-foreground font-medium mb-4">
                                    JSON-LD structured data is automatically added to your product pages for rich search results.
                                </p>
                                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 space-y-2">
                                    <p className="text-sm text-blue-900 font-medium">
                                        ✓ Organization schema (sitewide)
                                    </p>
                                    <p className="text-sm text-blue-900 font-medium">
                                        ✓ Product schema (product pages)
                                    </p>
                                    <p className="text-sm text-blue-900 font-medium">
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
