'use client';

import React, { useState, useEffect } from 'react';
import { Share2, Link2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SocialShareButtonsProps {
    store: any;
    product: any;
}

export function SocialShareButtons({ store, product }: SocialShareButtonsProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [canShare, setCanShare] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        setShareUrl(window.location.href);
        if (typeof navigator !== 'undefined' && !!(navigator as any).share) {
            setCanShare(true);
        }
    }, []);

    if (!isMounted) return null;

    const socialSettings = store.settings?.marketing?.socialSharing;
    if (!socialSettings || !socialSettings.enabled) return null;

    const enabledPlatforms = socialSettings.platforms || [];
    const defaultMessage = socialSettings.defaultMessage || 'Check out this amazing product!';
    const shareText = `${defaultMessage} - ${product.name}`;

    const handleNativeShare = async () => {
        try {
            await navigator.share({
                title: product.name,
                text: shareText,
                url: shareUrl,
            });
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                console.error('Error sharing:', error);
            }
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success('Product link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            toast.error('Failed to copy link');
        }
    };

    const shareTargets = [
        {
            id: 'whatsapp',
            name: 'WhatsApp',
            color: '#25D366',
            hoverColor: '#20ba59',
            icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.388 2.016 13.922 1 11.997 1 6.561 1 2.137 5.37 2.133 10.8c-.001 1.696.448 3.354 1.3 4.8l-.995 3.637 3.737-.968zm11.387-4.6c-.307-.154-1.817-.897-2.097-1-.28-.103-.483-.154-.686.154-.203.308-.787 1-1.017 1.256-.23.256-.46.287-.768.133-1.285-.64-2.141-1.09-2.987-2.56-.223-.388.223-.36.64-1.195.06-.13.03-.244-.015-.34-.045-.097-.483-1.16-.662-1.59-.174-.42-.365-.363-.483-.369-.124-.007-.267-.008-.41-.008-.143 0-.377.054-.573.27-.197.215-.752.736-.752 1.795s.77 2.083.877 2.227c.108.144 1.517 2.316 3.675 3.248 1.8.78 2.167.624 2.553.587.387-.037 1.817-.743 2.073-1.46.257-.717.257-1.33.18-1.46-.077-.13-.282-.208-.589-.363z" />
                </svg>
            ),
            url: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`
        },
        {
            id: 'facebook',
            name: 'Facebook',
            color: '#1877F2',
            hoverColor: '#166fe5',
            icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
            ),
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        },
        {
            id: 'twitter',
            name: 'X',
            color: '#000000',
            hoverColor: '#1a1a1a',
            icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
            ),
            url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
        },
        {
            id: 'pinterest',
            name: 'Pinterest',
            color: '#BD081C',
            hoverColor: '#ad071a',
            icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.966 1.406-5.966s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.162 0 7.397 2.967 7.397 6.93 0 4.136-2.607 7.464-6.227 7.464-1.215 0-2.359-.631-2.75-1.378l-.748 2.853c-.27 1.042-1.002 2.35-1.498 3.146 1.124.347 2.317.535 3.554.535 6.621 0 11.988-5.367 11.988-11.988C24.005 5.368 18.638 0 12.017 0z" />
                </svg>
            ),
            url: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(product.images?.[0]?.url || '')}&description=${encodeURIComponent(shareText)}`
        }
    ];

    const visiblePlatforms = shareTargets.filter(p => enabledPlatforms.includes(p.id));
    const showCopyLink = enabledPlatforms.includes('copyLink');

    const primaryColor = store.branding?.primaryColor || '#3B82F6';

    return (
        <div className="w-full space-y-4 pt-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">
                Share this Product
            </h4>

            {/* Mobile native sharing gets a prominent button */}
            {canShare ? (
                <button
                    onClick={handleNativeShare}
                    style={{ backgroundColor: primaryColor }}
                    className="w-full h-14 rounded-2xl text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform"
                >
                    <Share2 size={18} />
                    Share Product
                </button>
            ) : (
                <div className="flex flex-wrap gap-3">
                    {visiblePlatforms.map((platform) => (
                        <a
                            key={platform.id}
                            href={platform.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ backgroundColor: platform.color }}
                            className="w-12 h-12 rounded-xl text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-300 shadow-sm"
                            title={`Share on ${platform.name}`}
                        >
                            {platform.icon}
                        </a>
                    ))}

                    {showCopyLink && (
                        <button
                            onClick={handleCopyLink}
                            className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 shadow-sm ${
                                copied
                                    ? 'border-green-500 bg-green-50 text-green-600'
                                    : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
                            }`}
                            title="Copy link"
                        >
                            {copied ? <Check size={18} className="stroke-[3]" /> : <Link2 size={18} />}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
