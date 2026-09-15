'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Slide {
    id: string;
    type: 'image' | 'product';
    imageUrl: string;
    link?: string;
    productId?: string;
    productSlug?: string;
    productName?: string;
    caption?: string;
}

interface HeroSliderProps {
    slides: Slide[];
    primaryColor: string;
}

const AUTOPLAY_MS = 5000;

/**
 * Homepage hero carousel — the first section of the storefront when the
 * merchant has configured at least one slide (see the merchant dashboard's
 * Theme settings > Homepage Hero Slider). Each slide is either a plain
 * image (optionally linking anywhere the merchant typed) or a real product
 * (always linking to that product's page via the same root-relative
 * `/products/:id` convention ProductCatalog uses — it resolves correctly
 * whether this store is reached through the dev rewrite proxy or its own
 * real subdomain, since the rewrite is server-side and invisible to the
 * browser's address bar).
 *
 * Autoplays every 5s, pauses on hover, and is always overridable via the
 * arrow buttons or dot indicators.
 */
export default function HeroSlider({ slides, primaryColor }: HeroSliderProps) {
    const [index, setIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const goTo = useCallback((next: number) => {
        setIndex(((next % slides.length) + slides.length) % slides.length);
    }, [slides.length]);

    useEffect(() => {
        if (isPaused || slides.length <= 1) return;
        timerRef.current = setInterval(() => {
            setIndex((prev) => (prev + 1) % slides.length);
        }, AUTOPLAY_MS);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPaused, slides.length]);

    if (slides.length === 0) return null;

    return (
        <section
            className="relative h-[80vh] w-full overflow-hidden bg-gray-50"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {slides.map((slide, i) => {
                const href = slide.type === 'product'
                    ? (slide.productId ? `/products/${slide.productId}` : undefined)
                    : slide.link;

                const content = (
                    <>
                        <img
                            src={slide.imageUrl}
                            alt={slide.caption || slide.productName || ''}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading={i === 0 ? 'eager' : 'lazy'}
                            fetchPriority={i === 0 ? 'high' : 'auto'}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                        {(slide.caption || slide.productName) && (
                            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 text-white">
                                {slide.type === 'product' && (
                                    <span
                                        className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        Shop Now
                                    </span>
                                )}
                                <h2 className="text-2xl md:text-4xl font-black tracking-tight">
                                    {slide.caption || slide.productName}
                                </h2>
                            </div>
                        )}
                    </>
                );

                return (
                    <div
                        key={slide.id}
                        className="absolute inset-0 transition-opacity duration-700"
                        style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? 'auto' : 'none' }}
                        aria-hidden={i !== index}
                    >
                        {href ? (
                            <a href={href} className="block absolute inset-0">
                                {content}
                            </a>
                        ) : (
                            <div className="absolute inset-0">{content}</div>
                        )}
                    </div>
                );
            })}

            {slides.length > 1 && (
                <>
                    <button
                        type="button"
                        aria-label="Previous slide"
                        onClick={() => goTo(index - 1)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        aria-label="Next slide"
                        onClick={() => goTo(index + 1)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-lg transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                        {slides.map((s, i) => (
                            <button
                                key={s.id}
                                type="button"
                                aria-label={`Go to slide ${i + 1}`}
                                onClick={() => goTo(i)}
                                className="h-2 rounded-full transition"
                                style={{
                                    width: i === index ? '24px' : '8px',
                                    backgroundColor: i === index ? primaryColor : 'rgba(255,255,255,0.6)',
                                }}
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
