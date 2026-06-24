import React, { useEffect, useRef, useState } from 'react';

interface DownSellOverlayProps {
    /** Called when exit intent is detected. Should trigger evaluation. */
    onExitIntent: () => void;
    /** If true, the trigger won't fire (e.g. if an offer is already showing) */
    disabled?: boolean;
}

/**
 * Invisible component that detects exit intent and fires a callback.
 * Designed to be placed on the Checkout page to trigger 'checkout_abandon_intent' campaigns.
 */
export const DownSellOverlay: React.FC<DownSellOverlayProps> = ({ 
    onExitIntent, 
    disabled = false 
}) => {
    const hasTriggered = useRef(false);

    useEffect(() => {
        if (disabled) return;

        // Desktop: Detect mouse leaving the top of the viewport
        const handleMouseLeave = (e: MouseEvent) => {
            if (e.clientY <= 0 && !hasTriggered.current) {
                hasTriggered.current = true;
                onExitIntent();
            }
        };

        // Mobile: Detect fast scrolling up (often indicates trying to reach URL bar to leave)
        let lastScrollY = window.scrollY;
        let lastScrollTime = Date.now();
        
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const currentTime = Date.now();
            
            const distance = lastScrollY - currentScrollY;
            const time = currentTime - lastScrollTime;
            
            // If scrolling up fast (> 50px in < 100ms) near the top of the page
            if (distance > 50 && time < 100 && currentScrollY < 200 && !hasTriggered.current) {
                hasTriggered.current = true;
                onExitIntent();
            }
            
            lastScrollY = currentScrollY;
            lastScrollTime = currentTime;
        };

        // Mobile: Detect history popstate (back button)
        // We push a dummy state so when they hit back, we catch it instead of leaving
        const handlePopState = () => {
            if (!hasTriggered.current) {
                hasTriggered.current = true;
                // Re-push the state to prevent them from actually leaving right away
                window.history.pushState({ page: 'checkout' }, '', window.location.href);
                onExitIntent();
            }
        };

        // Setup
        document.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Push initial state for popstate detection
        window.history.pushState({ page: 'checkout' }, '', window.location.href);
        window.addEventListener('popstate', handlePopState);

        return () => {
            document.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [onExitIntent, disabled]);

    return null; // Invisible logical component
};
