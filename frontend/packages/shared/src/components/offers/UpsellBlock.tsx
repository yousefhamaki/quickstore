import React from 'react';
import { EvaluatedOffer, OfferProduct } from '../../lib/api/offers';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

interface UpsellBlockProps {
    offerProducts: OfferProduct[];
    replacesProductId?: string;
    type: EvaluatedOffer['type'];
    selectedOptionsMap?: Record<string, Record<string, string>[]>;
    onVariantChange?: (productId: string, itemIndex: number, optionName: string, value: string) => void;
}

export const UpsellBlock: React.FC<UpsellBlockProps> = ({ 
    offerProducts, 
    replacesProductId, 
    type, 
    selectedOptionsMap, 
    onVariantChange
}) => {
    return (
        <div className="flex flex-col gap-4">
            {offerProducts.map((product) => (
                <div key={`${product.productId}-${product.variantId || 'base'}`} className="flex items-center gap-4 p-4 border rounded-lg bg-card">
                    {product.image && (
                        <div className="flex-shrink-0 w-20 h-20 rounded overflow-hidden border bg-muted">
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                    )}
                    
                    <div className="flex-grow">
                        <div className="flex justify-between items-start">
                            <h4 className="font-semibold text-base line-clamp-2">{product.name}</h4>
                            <div className="text-right ml-4">
                                <div className="font-bold text-lg">
                                    ${product.offerPrice.toFixed(2)}
                                </div>
                                {product.savingsAmount > 0 && (
                                    <div className="text-sm text-muted-foreground line-through">
                                        ${product.basePrice.toFixed(2)}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="mt-2 flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Qty: {product.quantity}
                            </div>
                            
                            {product.savingsAmount > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                    Save ${(product.savingsAmount * product.quantity).toFixed(2)}
                                </span>
                            )}
                        </div>
                        
                        {/* Variant Selectors */}
                        {product.options && product.options.length > 0 && onVariantChange && (() => {
                            const options = product.options;
                            return (
                                <div className="mt-4 space-y-4">
                                    {Array.from({ length: product.quantity }).map((_, itemIndex) => (
                                        <div key={itemIndex} className="space-y-2 p-3 bg-muted/30 rounded-lg border border-dashed">
                                            {product.quantity > 1 && (
                                                <div className="text-xs font-bold uppercase tracking-wider text-primary">
                                                    Item #{itemIndex + 1}
                                                </div>
                                            )}
                                            {options.map((opt: any) => (
                                                <div key={opt.name} className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                        {opt.name}
                                                    </label>
                                                    <select
                                                        className="w-full h-10 px-3 bg-background border rounded-md text-sm outline-none focus:border-primary"
                                                        value={selectedOptionsMap?.[product.productId]?.[itemIndex]?.[opt.name] || ''}
                                                        onChange={(e) => onVariantChange(product.productId, itemIndex, opt.name, e.target.value)}
                                                    >
                                                        {opt.values.map((val: string) => (
                                                            <option key={val} value={val}>{val}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            ))}
            
            {type === 'upsell' && replacesProductId && (
                <div className="text-sm text-center text-muted-foreground mt-2 bg-muted/50 py-2 rounded">
                    This will replace your current selection.
                </div>
            )}
        </div>
    );
};
