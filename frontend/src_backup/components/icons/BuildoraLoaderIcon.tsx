'use client';

import React from 'react';

export function BuildoraLoaderIcon({ className = "w-16 h-16", color = "currentColor" }: { className?: string; color?: string }) {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-label="Buildora is building your store"
            role="img"
        >
            {/* Base Foundation - Bottom Left */}
            <path
                d="M20 45L20 75L50 90V60L20 45Z"
                fill={color}
                className="opacity-20 animate-[pulse_2s_infinite]"
            />

            {/* Base Foundation - Bottom Right */}
            <path
                d="M80 45L80 75L50 90V60L80 45Z"
                fill={color}
                className="opacity-40 animate-[pulse_2s_infinite_200ms]"
            />

            {/* Floating Top - The "Store" being placed */}
            <g className="animate-[bounce_2s_infinite_ease-in-out]">
                <path
                    d="M50 10L80 25L50 40L20 25L50 10Z"
                    fill={color}
                    className="drop-shadow-lg"
                />
                <path
                    d="M20 25V45L50 60V40L20 25Z"
                    fill={color}
                    className="opacity-80"
                />
                <path
                    d="M80 25V45L50 60V40L80 25Z"
                    fill={color}
                    className="opacity-60"
                />
            </g>

            {/* Wireframe Accents */}
            <path
                d="M20 25V75L50 90L80 75V25L50 10L20 25Z"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-30 [stroke-dasharray:300] [stroke-dashoffset:300] animate-[dash_3s_ease-in-out_infinite]"
            />
            <path
                d="M50 40V90"
                stroke={color}
                strokeWidth="1.5"
                className="opacity-30"
            />
            <path
                d="M20 25L50 40L80 25"
                stroke={color}
                strokeWidth="1.5"
                className="opacity-30"
            />

            <style jsx>{`
                @keyframes dash {
                    0% { stroke-dashoffset: 300; }
                    50% { stroke-dashoffset: 0; }
                    100% { stroke-dashoffset: -300; }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                }
            `}</style>
        </svg>
    );
}
