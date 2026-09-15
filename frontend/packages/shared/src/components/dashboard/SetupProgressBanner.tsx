'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Progress } from '@shared/components/ui/progress';
import { useStoreChecklist } from '@shared/lib/hooks/useStoreChecklist';

interface SetupProgressBannerProps {
    storeId: string;
}

/**
 * Persistent, always-visible reminder that the store's onboarding isn't
 * finished yet — rendered once in the store layout so it shows on every
 * screen under /dashboard/stores/[storeId]/*, not just the store's own
 * overview page (where the full OnboardingChecklist card already lives).
 * Renders nothing once the checklist reports 100%.
 */
export function SetupProgressBanner({ storeId }: SetupProgressBannerProps) {
    const t = useTranslations('merchant.storeDashboard.checklist');
    const { data: checklist } = useStoreChecklist(storeId);

    if (!checklist || checklist.progress.percentage >= 100) {
        return null;
    }

    return (
        <div className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 py-2.5 border-b bg-primary/5 backdrop-blur supports-[backdrop-filter]:bg-primary/5">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {t('banner.text', { percentage: checklist.progress.percentage })}
                        <span className="hidden sm:inline text-muted-foreground font-medium">
                            {' — '}{t('banner.subtext')}
                        </span>
                    </p>
                    <Link
                        href={`/dashboard/stores/${storeId}`}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 flex-shrink-0 group"
                    >
                        {t('banner.cta')}
                        <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>
                <Progress value={checklist.progress.percentage} className="h-1.5 mt-1.5" />
            </div>
        </div>
    );
}
