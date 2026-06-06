'use client';

import { useState } from 'react';
import { SEOSettings } from '@/types/seo';
import { Save, HelpCircle } from 'lucide-react';

interface GlobalSEOFormProps {
    settings: SEOSettings;
    onSave: (settings: SEOSettings) => Promise<void>;
    saving: boolean;
}

export function GlobalSEOForm({ settings, onSave, saving }: GlobalSEOFormProps) {
    const [formData, setFormData] = useState<SEOSettings>(settings);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const newErrors: Record<string, string> = {};

        if (formData.seoTitle && formData.seoTitle.length > 60) {
            newErrors.seoTitle = 'Title should be under 60 characters for optimal display';
        }

        if (formData.seoDescription && formData.seoDescription.length > 160) {
            newErrors.seoDescription = 'Description should be under 160 characters for optimal display';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        await onSave(formData);
    };

    const handleChange = (field: keyof SEOSettings, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Meta Title */}
            <div>
                <label htmlFor="seoTitle" className="block text-sm font-medium text-gray-700 mb-1">
                    Store Meta Title
                    <Tooltip text="The title that appears in search engine results. Keep it under 60 characters." />
                </label>
                <input
                    type="text"
                    id="seoTitle"
                    value={formData.seoTitle || ''}
                    onChange={(e) => handleChange('seoTitle', e.target.value)}
                    placeholder="Your Store Name - Online Store"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.seoTitle ? 'border-red-500' : 'border-gray-300'
                        }`}
                    maxLength={100}
                />
                <div className="flex justify-between mt-1">
                    <span className={`text-xs ${errors.seoTitle ? 'text-red-600' : 'text-gray-500'}`}>
                        {errors.seoTitle || `${formData.seoTitle?.length || 0}/60 characters (optimal)`}
                    </span>
                    {formData.seoTitle && formData.seoTitle.length > 60 && (
                        <span className="text-xs text-yellow-600">⚠️ Too long for optimal display</span>
                    )}
                </div>
            </div>

            {/* Meta Description */}
            <div>
                <label htmlFor="seoDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Store Meta Description
                    <Tooltip text="A brief description of your store that appears in search results. Keep it under 160 characters." />
                </label>
                <textarea
                    id="seoDescription"
                    value={formData.seoDescription || ''}
                    onChange={(e) => handleChange('seoDescription', e.target.value)}
                    placeholder="Shop the best products at great prices. Free shipping on orders over $50."
                    rows={3}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.seoDescription ? 'border-red-500' : 'border-gray-300'
                        }`}
                    maxLength={300}
                />
                <div className="flex justify-between mt-1">
                    <span className={`text-xs ${errors.seoDescription ? 'text-red-600' : 'text-gray-500'}`}>
                        {errors.seoDescription || `${formData.seoDescription?.length || 0}/160 characters (optimal)`}
                    </span>
                    {formData.seoDescription && formData.seoDescription.length > 160 && (
                        <span className="text-xs text-yellow-600">⚠️ Too long for optimal display</span>
                    )}
                </div>
            </div>

            {/* Keywords */}
            <div>
                <label htmlFor="seoKeywords" className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Keywords (Optional)
                    <Tooltip text="Comma-separated keywords related to your store. Modern search engines don't heavily rely on this." />
                </label>
                <input
                    type="text"
                    id="seoKeywords"
                    value={formData.seoKeywords?.join(', ') || ''}
                    onChange={(e) => handleChange('seoKeywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean))}
                    placeholder="ecommerce, online store, shopping"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Separate keywords with commas</p>
            </div>

            {/* Open Graph Type */}
            <div>
                <label htmlFor="ogType" className="block text-sm font-medium text-gray-700 mb-1">
                    Open Graph Type
                    <Tooltip text="How your store appears when shared on social media platforms like Facebook." />
                </label>
                <select
                    id="ogType"
                    value={formData.ogType || 'website'}
                    onChange={(e) => handleChange('ogType', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="website">Website</option>
                    <option value="article">Article</option>
                    <option value="product">Product</option>
                </select>
            </div>

            {/* Twitter Card */}
            <div>
                <label htmlFor="twitterCard" className="block text-sm font-medium text-gray-700 mb-1">
                    Twitter Card Type
                    <Tooltip text="How your store appears when shared on Twitter/X." />
                </label>
                <select
                    id="twitterCard"
                    value={formData.twitterCard || 'summary_large_image'}
                    onChange={(e) => handleChange('twitterCard', e.target.value as 'summary' | 'summary_large_image')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="summary">Summary (small image)</option>
                    <option value="summary_large_image">Summary with Large Image</option>
                </select>
            </div>

            {/* Twitter Site */}
            <div>
                <label htmlFor="twitterSite" className="block text-sm font-medium text-gray-700 mb-1">
                    Twitter Username (Optional)
                    <Tooltip text="Your Twitter/X username (e.g., @yourstore). Used for Twitter Card attribution." />
                </label>
                <input
                    type="text"
                    id="twitterSite"
                    value={formData.twitterSite || ''}
                    onChange={(e) => handleChange('twitterSite', e.target.value)}
                    placeholder="@yourstore"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Indexing Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                    <label htmlFor="allowIndexing" className="font-medium text-gray-900 flex items-center gap-2">
                        Allow Search Engine Indexing
                        <Tooltip text="When enabled, search engines like Google can index and show your store in search results." />
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                        Let search engines like Google index your store
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        id="allowIndexing"
                        checked={formData.allowIndexing !== false}
                        onChange={(e) => handleChange('allowIndexing', e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>

            {/* Sitemap Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                    <label htmlFor="sitemapEnabled" className="font-medium text-gray-900 flex items-center gap-2">
                        Enable XML Sitemap
                        <Tooltip text="Automatically generate an XML sitemap to help search engines discover your pages." />
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                        Generate sitemap.xml for search engines
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        id="sitemapEnabled"
                        checked={formData.sitemapEnabled !== false}
                        onChange={(e) => handleChange('sitemapEnabled', e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t">
                <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </form>
    );
}

function Tooltip({ text }: { text: string }) {
    const [show, setShow] = useState(false);

    return (
        <span className="relative inline-block ml-1">
            <button
                type="button"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                onFocus={() => setShow(true)}
                onBlur={() => setShow(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Help"
            >
                <HelpCircle size={16} />
            </button>
            {show && (
                <div className="absolute z-10 w-64 p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg -top-2 left-6">
                    {text}
                    <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -left-1 top-3"></div>
                </div>
            )}
        </span>
    );
}
