import { useState, useCallback, useRef } from 'react';
import { 
    evaluateOffers, 
    recordImpression, 
    recordDecision, 
    acceptOffer, 
    EvaluatedOffer,
    EvaluateOffersPayload
} from '../lib/api/offers';

const SEEN_CAMPAIGNS_KEY = 'quickstore_seen_campaigns';

const getSeenCampaigns = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
        const stored = sessionStorage.getItem(SEEN_CAMPAIGNS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const addSeenCampaign = (campaignId: string) => {
    if (typeof window === 'undefined') return;
    try {
        const seen = getSeenCampaigns();
        if (!seen.includes(campaignId)) {
            seen.push(campaignId);
            sessionStorage.setItem(SEEN_CAMPAIGNS_KEY, JSON.stringify(seen));
        }
    } catch {}
};

export interface UseOfferEngineReturn {
    /** The currently active offer that should be displayed to the user */
    currentOffer: EvaluatedOffer | null;
    /** The ID of the recorded impression for the current offer */
    impressionId: string | null;
    /** Is the engine currently fetching/evaluating offers or processing an acceptance? */
    isProcessing: boolean;
    /** Any error that occurred during the offer flow */
    error: string | null;
    /** Trigger evaluation of offers based on a cart event (e.g. checkout_start) */
    triggerEvaluation: (payload: EvaluateOffersPayload, orderId?: string) => Promise<void>;
    /** Handle shopper accepting the offer, optionally passing updated products (e.g. with selected variants) */
    handleAccept: (updatedProducts?: any[]) => Promise<void>;
    /** Handle shopper declining the offer */
    handleDecline: () => Promise<void>;
    /** Check if there are more offers in the queue */
    hasMoreOffers: boolean;
}

export function useOfferEngine(
    onAcceptSuccess?: (result: any) => void,
    onQueueEmpty?: () => void
): UseOfferEngineReturn {
    const [offerQueue, setOfferQueue] = useState<EvaluatedOffer[]>([]);
    const [currentOffer, setCurrentOffer] = useState<EvaluatedOffer | null>(null);
    const [impressionId, setImpressionId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Keep refs for data needed across the flow
    const contextRef = useRef<{
        storeId: string;
        sessionId: string;
        customerId?: string;
        orderId?: string;
        cartValueAtTime: number;
    } | null>(null);

    /**
     * Pops the next offer from the queue, records an impression, and sets it as active.
     * If the queue is empty, triggers the onQueueEmpty callback.
     */
    const showNextOffer = useCallback(async (queue: EvaluatedOffer[]) => {
        if (queue.length === 0) {
            setCurrentOffer(null);
            setImpressionId(null);
            if (onQueueEmpty) onQueueEmpty();
            return;
        }

        const nextOffer = queue[0];
        const remainingQueue = queue.slice(1);
        setOfferQueue(remainingQueue);
        setCurrentOffer(nextOffer);

        if (!contextRef.current) return;

        try {
            // Immediately record the impression when the offer is shown
            const impId = await recordImpression({
                storeId: contextRef.current.storeId,
                campaignId: nextOffer.campaignId,
                sessionId: contextRef.current.sessionId,
                customerId: contextRef.current.customerId,
                orderId: contextRef.current.orderId,
                offerType: nextOffer.type,
                snapshot: nextOffer.snapshot,
                cartValueAtTime: contextRef.current.cartValueAtTime
            });
            setImpressionId(impId);
        } catch (err) {
            console.error('Failed to record impression:', err);
            // If we fail to record the impression, we skip this offer and try the next one
            // because we can't accept/decline without an impressionId.
            showNextOffer(remainingQueue);
        }
    }, [onQueueEmpty]);

    const triggerEvaluation = useCallback(async (payload: EvaluateOffersPayload, orderId?: string) => {
        setIsProcessing(true);
        setError(null);
        try {
            contextRef.current = {
                storeId: payload.storeId,
                sessionId: payload.sessionId,
                customerId: payload.customerId,
                orderId,
                cartValueAtTime: payload.cartSubtotal
            };

            const offers = await evaluateOffers(payload);
            
            if (offers && offers.length > 0) {
                const seenCampaigns = getSeenCampaigns();
                const filteredOffers = offers.filter(o => !seenCampaigns.includes(o.campaignId));
                
                if (filteredOffers.length > 0) {
                    await showNextOffer(filteredOffers);
                } else {
                    setOfferQueue([]);
                    setCurrentOffer(null);
                    setImpressionId(null);
                    if (onQueueEmpty) onQueueEmpty();
                }
            } else {
                setOfferQueue([]);
                setCurrentOffer(null);
                setImpressionId(null);
                if (onQueueEmpty) onQueueEmpty();
            }
        } catch (err: any) {
            console.error('Offer evaluation failed:', err);
            setError(err.message || 'Failed to evaluate offers');
            if (onQueueEmpty) onQueueEmpty(); // Fail gracefully
        } finally {
            setIsProcessing(false);
        }
    }, [showNextOffer, onQueueEmpty]);

    const handleAccept = useCallback(async (updatedProducts?: any[]) => {
        if (!currentOffer || !impressionId) {
            setError('Missing required data to accept offer');
            return;
        }

        // Synchronously blacklist and prepare queue
        addSeenCampaign(currentOffer.campaignId);
        const nextOfferQueue = [...offerQueue];
        const acceptedOffer = currentOffer;
        const currentImpression = impressionId;
        
        // Optimistically clear current offer
        setCurrentOffer(null);
        setImpressionId(null);

        setIsProcessing(true);
        setError(null);
        try {
            if (contextRef.current?.orderId) {
                // Server-side acceptance (mutates existing order)
                // Note: For advanced variants, we'd pass updatedProducts to the API here
                const result = await acceptOffer({
                    impressionId: currentImpression,
                    orderId: contextRef.current.orderId,
                    sessionId: contextRef.current.sessionId
                });

                if (onAcceptSuccess) {
                    onAcceptSuccess(result);
                }
            } else {
                // Local acceptance (pre-checkout)
                await recordDecision(currentImpression, 'accepted');
                if (onAcceptSuccess) {
                    onAcceptSuccess({ 
                        localAccept: true, 
                        offer: updatedProducts 
                            ? { ...acceptedOffer, offerProducts: updatedProducts } 
                            : acceptedOffer 
                    });
                }
            }

            // Move to next offer
            await showNextOffer(nextOfferQueue);
        } catch (err: any) {
            console.error('Offer accept failed:', err);
            setError(err.message || 'Failed to accept offer');
            await showNextOffer(nextOfferQueue);
        } finally {
            setIsProcessing(false);
        }
    }, [currentOffer, impressionId, offerQueue, showNextOffer, onAcceptSuccess]);

    const handleDecline = useCallback(async () => {
        if (!currentOffer || !impressionId) return;

        // Synchronously blacklist and prepare queue
        addSeenCampaign(currentOffer.campaignId);
        const nextOfferQueue = [...offerQueue];
        const currentImpression = impressionId;

        // Optimistically clear current offer
        setCurrentOffer(null);
        setImpressionId(null);

        setIsProcessing(true);
        try {
            await recordDecision(currentImpression, 'declined');
            // Move to next offer
            await showNextOffer(nextOfferQueue);
        } catch (err: any) {
            console.error('Offer decline failed:', err);
            await showNextOffer(nextOfferQueue);
        } finally {
            setIsProcessing(false);
        }
    }, [currentOffer, impressionId, offerQueue, showNextOffer]);

    return {
        currentOffer,
        impressionId,
        isProcessing,
        error,
        triggerEvaluation,
        handleAccept,
        handleDecline,
        hasMoreOffers: offerQueue.length > 0
    };
}
