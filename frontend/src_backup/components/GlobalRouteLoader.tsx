'use client';

import React from 'react';
import { useNavigation } from '@/providers/NavigationProvider';
import { useTranslations } from 'next-intl';
import { BuildoraLoaderIcon } from '@/components/icons/BuildoraLoaderIcon';

export function GlobalRouteLoader() {
    const { isNavigating } = useNavigation();

    // Safely try to get translations, fallback if not loaded yet
    let t;
    try {
        t = useTranslations('common');
    } catch (e) {
        // Fallback or ignore
    }

    if (!isNavigating) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xl transition-all duration-500 animate-in fade-in"
            aria-busy="true"
            aria-live="polite"
        >
            <div className="flex flex-col items-center gap-8 p-12 text-center pointer-events-none">
                <div className="relative">
                    {/* Glowing Aura background */}
                    <div className="absolute -inset-10 bg-primary/20 rounded-full blur-[60px] animate-pulse" />

                    <div className="relative transform transition-transform duration-700">
                        <BuildoraLoaderIcon className="w-24 h-24 text-primary" />
                    </div>

                    {/* Orbiting particles (decorative) */}
                    <div className="absolute top-0 left-0 w-full h-full animate-[spin_4s_linear_infinite]">
                        <div className="absolute top-0 left-1/2 -ml-1 w-2 h-2 rounded-full bg-primary/40 blur-[1px]" />
                        <div className="absolute bottom-0 left-1/2 -ml-1 w-1.5 h-1.5 rounded-full bg-primary/20 blur-[1px]" />
                    </div>
                </div>

                <div className="space-y-4 max-w-xs transition-all duration-300">
                    <h3 className="text-2xl font-black tracking-tighter text-white drop-shadow-sm uppercase italic">
                        {t ? t('loading.building') : 'Building Buildora...'}
                    </h3>
                    <div className="flex flex-col items-center gap-3">
                        <p className="text-primary/70 font-bold text-[10px] uppercase tracking-[0.3em] animate-pulse">
                            Constructing your store
                        </p>
                        {/* Minimal progress line */}
                        <div className="w-48 h-[1px] bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-full origin-left animate-[progress_2s_infinite_ease-in-out]" />
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes progress {
                    0% { transform: scaleX(0); transform-origin: left; }
                    45% { transform: scaleX(1); transform-origin: left; }
                    50% { transform: scaleX(1); transform-origin: right; }
                    100% { transform: scaleX(0); transform-origin: right; }
                }
                body {
                    overflow: hidden !important;
                    pointer-events: none !important;
                    touch-action: none !important;
                }
            `}</style>
        </div>
    );
}
