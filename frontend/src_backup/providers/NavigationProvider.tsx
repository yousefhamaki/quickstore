'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface NavigationContextType {
    isNavigating: boolean;
    startNavigation: () => void;
    endNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
    const [isNavigating, setIsNavigating] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const startNavigation = useCallback(() => {
        setIsNavigating(true);
    }, []);

    const endNavigation = useCallback(() => {
        setIsNavigating(false);
    }, []);

    // Automatically end navigation when the path or search params change
    useEffect(() => {
        setIsNavigating(false);
    }, [pathname, searchParams]);

    // Handle browser back/forward buttons
    useEffect(() => {
        const handlePopState = () => {
            // On popstate, we can't easily track "start" but we can ensure "end" happens
            setIsNavigating(false);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
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
