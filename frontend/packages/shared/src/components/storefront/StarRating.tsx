'use client';

import { Star } from 'lucide-react';
import { cn } from '@shared/lib/utils';

interface StarRatingProps {
    rating: number;
    size?: number;
    interactive?: boolean;
    onChange?: (value: number) => void;
    className?: string;
}

/**
 * Renders 5 stars filled up to `rating` (supports halves visually via
 * rounding, since the underlying data is an integer 1-5 anyway). Pass
 * `interactive` + `onChange` to use it as a picker in the review form.
 */
export function StarRating({ rating, size = 16, interactive = false, onChange, className }: StarRatingProps) {
    return (
        <div className={cn('flex items-center gap-0.5', className)}>
            {[1, 2, 3, 4, 5].map((value) => {
                const filled = value <= Math.round(rating);
                return (
                    <button
                        key={value}
                        type="button"
                        disabled={!interactive}
                        onClick={() => onChange?.(value)}
                        className={cn(!interactive && 'cursor-default', interactive && 'cursor-pointer hover:scale-110 transition-transform')}
                        aria-label={`${value} star${value > 1 ? 's' : ''}`}
                    >
                        <Star
                            size={size}
                            className={filled ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-gray-300'}
                        />
                    </button>
                );
            })}
        </div>
    );
}
