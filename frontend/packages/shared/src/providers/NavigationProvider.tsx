'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface NavigationContextType {
    isNavigating: boolean;
    startNavigation: () => void;
    endNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Real per-route loading (loading.tsx / Suspense) now covers the "user
// knows content is loading" job — this flag is just a light touch (a
// cursor + slight link dimming, see NavLink.tsx) while the actual
// navigation is in flight, never a blocking overlay. It used to have no
// timeout at all: if a navigation never actually changed the URL (a
// same-route click, a blocked cross-zone Link, a silently-failed
// transition), isNavigating stayed true forever, which — combined with
// NavLink disabling every link while true — could permanently freeze all
// in-app navigation until a manual reload. This timeout is the safety
// valve for that.
const STUCK_NAVIGATION_TIMEOUT_MS = 8000;

export function NavigationProvider({ children }: { children: React.ReactNode }) {
    const [isNavigating, setIsNavigating] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearStuckTimeout = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    const startNavigation = useCallback(() => {
        setIsNavigating(true);
        clearStuckTimeout();
        timeoutRef.current = setTimeout(() => setIsNavigating(false), STUCK_NAVIGATION_TIMEOUT_MS);
    }, []);

    const endNavigation = useCallback(() => {
        clearStuckTimeout();
        setIsNavigating(false);
    }, []);

    // Automatically end navigation when the path or search params change
    useEffect(() => {
        clearStuckTimeout();
        setIsNavigating(false);
    }, [pathname, searchParams]);

    // Handle browser back/forward buttons
    useEffect(() => {
        const handlePopState = () => {
            // On popstate, we can't easily track "start" but we can ensure "end" happens
            clearStuckTimeout();
            setIsNavigating(false);
        };
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
            clearStuckTimeout();
        };
    }, []);

    return (
        <NavigationContext.Provider value={{ isNavigating, startNavigation, endNavigation }}>
            <div className={isNavigating ? "cursor-wait" : ""}>
                {children}
            </div>
        </NavigationContext.Provider>
    );
}

export function useNavigation() {
    const context = useContext(NavigationContext);
    if (context === undefined) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
}
