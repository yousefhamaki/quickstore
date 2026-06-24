import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { EvaluatedOffer } from '../../lib/api/offers';
import { UpsellBlock } from './UpsellBlock';
import { Plus, Minus, X } from 'lucide-react';

interface OfferModalProps {
    offer: EvaluatedOffer | null;
    isOpen: boolean;
    isProcessing: boolean;
    onAccept: (updatedProducts?: any[]) => void;
    onDecline: () => void;
}

export const OfferModal: React.FC<OfferModalProps> = ({
    offer,
    isOpen,
    isProcessing,
    onAccept,
    onDecline,
}) => {
    const [multiplier, setMultiplier] = React.useState(1);
    const [selectedOptionsMap, setSelectedOptionsMap] = React.useState<Record<string, Record<string, string>[]>>({});

    React.useEffect(() => {
        if (offer && isOpen) {
            const initialMap: Record<string, Record<string, string>[]> = {};
            offer.offerProducts.forEach(op => {
                const options = op.options;
                if (options && options.length > 0) {
                    initialMap[op.productId] = Array.from({ length: op.quantity * multiplier }).map((_, index) => {
                        // Preserve existing selection if it exists, otherwise use default
                        const existing = selectedOptionsMap[op.productId]?.[index];
                        if (existing) return existing;
                        
                        const itemSelections: Record<string, string> = {};
                        options.forEach(opt => {
                            itemSelections[opt.name] = opt.values[0];
                        });
                        return itemSelections;
                    });
                }
            });
            setSelectedOptionsMap(initialMap);
        }
    }, [offer, isOpen, multiplier]);

    // Reset multiplier when modal closes/opens
    React.useEffect(() => {
        if (!isOpen) setMultiplier(1);
    }, [isOpen]);

    if (!offer) return null;

    const handleVariantChange = (productId: string, itemIndex: number, optionName: string, value: string) => {
        setSelectedOptionsMap(prev => {
            const productSelections = [...(prev[productId] || [])];
            if (!productSelections[itemIndex]) {
                productSelections[itemIndex] = {};
            }
            productSelections[itemIndex] = {
                ...productSelections[itemIndex],
                [optionName]: value
            };
            return {
                ...prev,
                [productId]: productSelections
            };
        });
    };

    const handleAcceptClick = () => {
        const updatedProducts: any[] = [];
        
        offer.offerProducts.forEach(op => {
            const selectionsArray = selectedOptionsMap[op.productId];
            
            if (selectionsArray && selectionsArray.length > 0) {
                selectionsArray.forEach((selected) => {
                    let variantId = op.variantId;
                    if (op.variants) {
                        const matchingVariant = op.variants.find(v => {
                            return Object.entries(selected).every(([key, val]) => v.options[key] === val);
                        });
                        if (matchingVariant) variantId = matchingVariant._id;
                    }
                    updatedProducts.push({
                        ...op,
                        quantity: 1,
                        variantId,
                        selectedOptions: selected
                    });
                });
            } else {
                updatedProducts.push(op);
            }
        });
        
        onAccept(updatedProducts);
    };

    // The shopper MUST explicitly accept or decline to record the decision cleanly.
    return (
        <Dialog open={isOpen} onOpenChange={() => {}}>
            <DialogContent showCloseButton={false} className="max-w-[95vw] w-[1000px] h-[90vh] p-0 overflow-hidden flex flex-col bg-gray-50/50">
                
                {/* Header Area */}
                <div className="relative flex-shrink-0 bg-white border-b px-6 py-6 md:px-10 md:py-8 flex flex-col items-center justify-center">
                    <button onClick={onDecline} className="absolute right-6 top-6 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                        <X size={24} />
                    </button>
                    
                    <DialogHeader>
                        <DialogTitle className="text-3xl md:text-4xl font-black text-center tracking-tighter">
                            {offer.display.title}
                        </DialogTitle>
                        {offer.display.subtitle && (
                            <DialogDescription className="text-center text-lg md:text-xl mt-2 font-medium">
                                {offer.display.subtitle}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10">
                    <div className="max-w-3xl mx-auto space-y-8">
                        {/* We use UpsellBlock but we pass scaled products based on multiplier */}
                        <UpsellBlock 
                            offerProducts={offer.offerProducts.map(op => ({
                                ...op,
                                quantity: op.quantity * multiplier
                            }))} 
                            type={offer.type} 
                            replacesProductId={offer.replacesProductId} 
                            selectedOptionsMap={selectedOptionsMap}
                            onVariantChange={handleVariantChange}
                        />
                        
                        <div className="flex items-center justify-between bg-white p-6 rounded-2xl border shadow-sm mt-8">
                            <span className="font-bold text-gray-500 uppercase tracking-widest text-sm">Offer Quantity</span>
                            <div className="flex items-center bg-gray-50 rounded-[20px] p-1 border">
                                <button
                                    onClick={() => setMultiplier(Math.max(1, multiplier - 1))}
                                    className="w-12 h-12 flex items-center justify-center hover:bg-white rounded-[16px] transition-all text-gray-600 hover:text-black"
                                >
                                    <Minus size={18} />
                                </button>
                                <span className="w-12 text-center font-black text-lg">{multiplier}</span>
                                <button
                                    onClick={() => setMultiplier(multiplier + 1)}
                                    className="w-12 h-12 flex items-center justify-center hover:bg-white rounded-[16px] transition-all text-gray-600 hover:text-black"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sticky Footer */}
                <div className="flex-shrink-0 bg-white border-t p-6 md:p-8 flex items-center justify-center">
                    <div className="max-w-xl w-full flex flex-col gap-4">
                        <Button 
                            size="lg" 
                            onClick={handleAcceptClick} 
                            disabled={isProcessing}
                            className="w-full text-lg h-16 rounded-[20px] font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform"
                        >
                            {isProcessing ? 'Processing...' : offer.display.callToActionText}
                        </Button>
                        <button 
                            onClick={onDecline} 
                            disabled={isProcessing}
                            className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors py-2 uppercase tracking-widest"
                        >
                            {offer.display.declineText || 'No thanks'}
                        </button>
                    </div>
                </div>
                
            </DialogContent>
        </Dialog>
    );
};
