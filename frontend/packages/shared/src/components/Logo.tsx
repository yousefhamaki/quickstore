'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
    /** Badge size in px — the wordmark scales proportionally. Default 40 (Navbar/Footer size). */
    size?: number;
    /** Hide the "Buildora" text next to the badge, e.g. for a compact/collapsed sidebar. */
    showWordmark?: boolean;
    /** Text shown next to the badge — defaults to "Buildora"; pass a translated brand name where relevant. */
    label?: string;
    /** className applied to the wordmark <span> (font size/weight/color is the caller's call per placement). */
    wordmarkClassName?: string;
    /** className applied to the outer flex wrapper. */
    className?: string;
    /**
     * Adds a premium entrance (fade/scale/rotate in on mount) plus a soft
     * breathing glow and a springy hover lift. Opt-in and off by default —
     * meant for the one "hero" placement of the mark (the site header),
     * not every sidebar/footer occurrence of it.
     */
    animated?: boolean;
}

/**
 * The Buildora brand mark — a solid-blue rounded-square badge with a bold
 * white "B", paired with a "Buildora" wordmark. Mirrors the mobile-merchant
 * app's in-JSX badge exactly (frontend/apps/mobile-merchant/app/(auth)/login.tsx),
 * which has no separate image asset — this is the shared source of truth
 * for the web app's logo, replacing the old new-logo.png gradient mark.
 */
export function Logo({ size = 40, showWordmark = true, label = 'Buildora', wordmarkClassName = '', className = '', animated = false }: LogoProps) {
    const radius = Math.round(size * 0.37); // matches mobile's 22px badge / 60px size ratio
    const fontSize = Math.round(size * 0.47);

    const badgeStyle: React.CSSProperties = {
        width: size,
        height: size,
        borderRadius: radius,
        background: '#2563EB',
        boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)',
    };

    const badge = animated ? (
        <motion.div
            className="flex items-center justify-center flex-shrink-0"
            style={badgeStyle}
            initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
            animate={{
                opacity: 1,
                scale: 1,
                rotate: 0,
                boxShadow: [
                    '0 8px 20px rgba(37, 99, 235, 0.35)',
                    '0 8px 28px rgba(37, 99, 235, 0.55)',
                    '0 8px 20px rgba(37, 99, 235, 0.35)',
                ],
            }}
            transition={{
                opacity: { duration: 0.6, ease: 'easeOut' },
                scale: { type: 'spring', stiffness: 260, damping: 18 },
                rotate: { type: 'spring', stiffness: 260, damping: 18 },
                boxShadow: { duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 },
            }}
            whileHover={{ scale: 1.08, rotate: -4 }}
        >
            <span className="text-white font-extrabold" style={{ fontSize, letterSpacing: -0.5, lineHeight: 1 }}>
                B
            </span>
        </motion.div>
    ) : (
        <div className="flex items-center justify-center flex-shrink-0" style={badgeStyle}>
            <span className="text-white font-extrabold" style={{ fontSize, letterSpacing: -0.5, lineHeight: 1 }}>
                B
            </span>
        </div>
    );

    const wordmark = showWordmark && (
        animated ? (
            <motion.span
                className={wordmarkClassName}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
            >
                {label}
            </motion.span>
        ) : (
            <span className={wordmarkClassName}>{label}</span>
        )
    );

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {badge}
            {wordmark}
        </div>
    );
}
