import React from 'react';
import { EvaluatedOffer } from '../../lib/api/offers';
import { Sparkles, ArrowRight } from 'lucide-react';

interface UpsellTeaserProps {
    offer: EvaluatedOffer;
    onClick: () => void;
}

export const UpsellTeaser: React.FC<UpsellTeaserProps> = ({ offer, onClick }) => {
    const mainProduct = offer.offerProducts[0];
    
    return (
        <div 
            onClick={onClick}
            className="group cursor-pointer mt-8 p-1 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent hover:from-primary/30 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4"
        >
            <div className="flex items-center gap-4 bg-background border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                {mainProduct?.image ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                        <img src={mainProduct.image} alt={mainProduct.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>
                ) : (
                    <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="text-primary w-8 h-8" />
                    </div>
                )}
                
                <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-widest text-primary">Special Offer</span>
                    </div>
                    <h4 className="font-bold text-sm line-clamp-1">{offer.display.title}</h4>
                    {offer.display.subtitle && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{offer.display.subtitle}</p>
                    )}
                </div>
                
                <div className="flex-shrink-0 px-2 flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <ArrowRight size={18} />
                </div>
            </div>
        </div>
    );
};
