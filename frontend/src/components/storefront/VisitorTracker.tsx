'use client';

import { useEffect, useRef } from 'react';
import { trackVisit } from '@/services/publicStoreService';

interface VisitorTrackerProps {
    storeId: string;
}

export function VisitorTracker({ storeId }: VisitorTrackerProps) {
    const tracked = useRef(false);

    useEffect(() => {
        if (!tracked.current && storeId) {
            trackVisit(storeId).catch(err => console.error('Failed to track visit:', err));
            tracked.current = true;
        }
    }, [storeId]);

    return null;
}
