import React from 'react';

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
}

/**
 * The Buildora brand mark — a solid-blue rounded-square badge with a bold
 * white "B", paired with a "Buildora" wordmark. Mirrors the mobile-merchant
 * app's in-JSX badge exactly (frontend/apps/mobile-merchant/app/(auth)/login.tsx),
 * which has no separate image asset — this is the shared source of truth
 * for the web app's logo, replacing the old new-logo.png gradient mark.
 */
export function Logo({ size = 40, showWordmark = true, label = 'Buildora', wordmarkClassName = '', className = '' }: LogoProps) {
    const radius = Math.round(size * 0.37); // matches mobile's 22px badge / 60px size ratio
    const fontSize = Math.round(size * 0.47);

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                    width: size,
                    height: size,
                    borderRadius: radius,
                    background: '#2563EB',
                    boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)',
                }}
            >
                <span className="text-white font-extrabold" style={{ fontSize, letterSpacing: -0.5, lineHeight: 1 }}>
                    B
                </span>
            </div>
            {showWordmark && <span className={wordmarkClassName}>{label}</span>}
        </div>
    );
}
