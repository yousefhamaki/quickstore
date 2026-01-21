# QuickStore Phase 2.2 - Part 2: Component Implementations

## 📦 **REUSABLE COMPONENTS**

This guide covers all the reusable components needed for the multi-store dashboard.

---

## **COMPONENT 1: StatusBadge**

**File:** `src/components/dashboard/StatusBadge.tsx`

```tsx
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StoreStatus = 'draft' | 'live' | 'paused';

interface StatusBadgeProps {
  status: StoreStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = {
    draft: {
      label: 'Draft',
      icon: '🟡',
      className: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'
    },
    live: {
      label: 'Live',
      icon: '🟢',
      className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
    },
    paused: {
      label: 'Paused',
      icon: '⏸️',
      className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
    }
  };

  const { label, icon, className: statusClass } = config[status];

  return (
    <Badge className={cn(statusClass, 'font-semibold', className)} variant="outline">
      <span className="mr-1">{icon}</span>
      {label}
    </Badge>
  );
}
```

---

## **COMPONENT 2: StoreCard**

**File:** `src/components/dashboard/StoreCard.tsx`

```tsx
'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { Store } from '@/types/store';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, Settings, Eye, Pause, Play, Rocket } from 'lucide-react';

interface StoreCardProps {
  store: Store;
  onPause?: (storeId: string) => void;
  onResume?: (storeId: string) => void;
  onPublish?: (storeId: string) => void;
}

export function StoreCard({ store, onPause, onResume, onPublish }: StoreCardProps) {
  const storeUrl = `https://${store.domain.subdomain}.quickstore.com`;

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-200">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          {/* Store Logo */}
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-gray-200">
            {store.logo?.url ? (
              <Image
                src={store.logo.url}
                alt={store.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-blue-600">
                {store.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Status Badge */}
          <StatusBadge status={store.status} />
        </div>

        {/* Store Name & URL */}
        <div>
          <h3 className="font-bold text-xl truncate group-hover:text-blue-600 transition-colors">
            {store.name}
          </h3>
          {store.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mt-1">
              {store.description}
            </p>
          )}
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 mt-2 transition-colors"
          >
            <span className="truncate">{store.domain.subdomain}.quickstore.com</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-900">
              {store.stats.totalProducts}
            </div>
            <div className="text-xs text-blue-700 font-medium">Products</div>
          </div>
          {store.status === 'live' ? (
            <>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-900">
                  {store.stats.totalOrders}
                </div>
                <div className="text-xs text-green-700 font-medium">Orders</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-purple-900">
                  {(store.stats.totalRevenue / 1000).toFixed(1)}K
                </div>
                <div className="text-xs text-purple-700 font-medium">EGP</div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-400">-</div>
                <div className="text-xs text-gray-500">Orders</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-400">-</div>
                <div className="text-xs text-gray-500">Revenue</div>
              </div>
            </>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        {/* Manage Button */}
        <Button asChild className="flex-1 font-semibold" variant="default">
          <Link href={`/dashboard/stores/${store._id}`}>
            <Settings className="w-4 h-4 mr-2" />
            Manage
          </Link>
        </Button>

        {/* Action Buttons */}
        {store.status === 'draft' && (
          <>
            <Button variant="outline" size="icon" asChild title="Preview Store">
              <Link href={`/preview/${store._id}`}>
                <Eye className="w-4 h-4" />
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => onPublish?.(store._id)}
              title="Go Live"
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Rocket className="w-4 h-4" />
            </Button>
          </>
        )}

        {store.status === 'live' && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPause?.(store._id)}
            title="Pause Store"
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          >
            <Pause className="w-4 h-4" />
          </Button>
        )}

        {store.status === 'paused' && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => onResume?.(store._id)}
            title="Resume Store"
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <Play className="w-4 h-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

---

## **COMPONENT 3: StoreGrid**

**File:** `src/components/dashboard/StoreGrid.tsx`

```tsx
'use client';

import { Store } from '@/types/store';
import { StoreCard } from './StoreCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Store as StoreIcon } from 'lucide-react';

interface StoreGridProps {
  stores: Store[];
  isLoading?: boolean;
  onPause?: (storeId: string) => void;
  onResume?: (storeId: string) => void;
  onPublish?: (storeId: string) => void;
}

export function StoreGrid({ stores, isLoading, onPause, onResume, onPublish }: StoreGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-[320px] rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
          <StoreIcon className="w-12 h-12 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold mb-2 text-gray-900">No stores yet</h3>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Create your first store to start selling online. It only takes a few minutes!
        </p>
        <Button asChild size="lg" className="font-semibold">
          <Link href="/dashboard/stores/new">
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Store
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stores.map((store) => (
        <StoreCard
          key={store._id}
          store={store}
          onPause={onPause}
          onResume={onResume}
          onPublish={onPublish}
        />
      ))}
    </div>
  );
}
```

---

## **COMPONENT 4: OnboardingChecklist**

**File:** `src/components/dashboard/OnboardingChecklist.tsx`

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ArrowRight, Rocket } from 'lucide-react';
import Link from 'next/link';
import { OnboardingChecklist as ChecklistType } from '@/types/store';

interface OnboardingChecklistProps {
  checklist: ChecklistType;
  storeId: string;
  onGoLive?: () => void;
}

export function OnboardingChecklist({ checklist, storeId, onGoLive }: OnboardingChecklistProps) {
  const { progress } = checklist;
  const isReady = progress.percentage === 100;

  const checklistItems = [
    {
      id: 'storeInfo',
      ...checklist.checklist.storeInfo,
      link: `/dashboard/stores/${storeId}/settings/general`
    },
    {
      id: 'branding',
      ...checklist.checklist.branding,
      link: `/dashboard/stores/${storeId}/settings/general`
    },
    {
      id: 'products',
      ...checklist.checklist.products,
      link: `/dashboard/stores/${storeId}/products`,
      extra: checklist.checklist.products.current 
        ? `${checklist.checklist.products.current}/${checklist.checklist.products.target}`
        : undefined
    },
    {
      id: 'payment',
      ...checklist.checklist.payment,
      link: `/dashboard/stores/${storeId}/settings/payments`
    },
    {
      id: 'shipping',
      ...checklist.checklist.shipping,
      link: `/dashboard/stores/${storeId}/settings/shipping`
    },
    {
      id: 'policies',
      ...checklist.checklist.policies,
      link: `/dashboard/stores/${storeId}/settings/policies`
    },
  ];

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-blue-600" />
            Ready to Launch?
          </span>
          <span className="text-sm font-normal text-gray-500">
            {progress.completed}/{progress.total} completed
          </span>
        </CardTitle>
        <Progress value={progress.percentage} className="mt-3 h-2" />
        <div className="text-sm text-gray-500 mt-1">
          {progress.percentage}% complete
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {checklistItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between py-3 border-b last:border-0 hover:bg-gray-50 rounded-lg px-2 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              {item.completed ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
              )}
              <div className="flex-1">
                <span className={`${item.completed ? 'text-gray-500 line-through' : 'text-gray-900 font-medium'}`}>
                  {item.label}
                </span>
                {item.extra && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({item.extra})
                  </span>
                )}
              </div>
            </div>
            {!item.completed && item.link && (
              <Button variant="ghost" size="sm" asChild className="text-blue-600">
                <Link href={item.link}>
                  Setup <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        ))}

        <div className="pt-4 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            asChild
          >
            <Link href={`/preview/${storeId}`}>
              <Eye className="w-4 h-4 mr-2" />
              Preview Store
            </Link>
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={!isReady}
            onClick={onGoLive}
          >
            <Rocket className="w-4 h-4 mr-2" />
            Go Live
          </Button>
        </div>

        {!isReady && (
          <p className="text-sm text-amber-600 text-center pt-2">
            ⚠️ Complete all steps to publish your store
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## **COMPONENT 5: PublishModal**

**File:** `src/components/dashboard/PublishModal.tsx`

```tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Copy, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeUrl: string;
  storeName: string;
  onConfirm: () => Promise<void>;
  isReady: boolean;
  missingSteps?: string[];
}

export function PublishModal({
  isOpen,
  onClose,
  storeUrl,
  storeName,
  onConfirm,
  isReady,
  missingSteps = []
}: PublishModalProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await onConfirm();
      setIsPublished(true);
    } catch (error) {
      console.error('Publish failed:', error);
      toast.error('Failed to publish store');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleShare = (platform: string) => {
    const text = `Check out my new store: ${storeName}`;
    const urls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} - ${storeUrl}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text} - ${storeUrl}`)}`
    };
    window.open(urls[platform as keyof typeof urls], '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    toast.success('Link copied to clipboard!');
  };

  const handleClose = () => {
    setIsPublished(false);
    onClose();
  };

  // Success Screen
  if (isPublished) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">
              🎉 Your Store is Now Live!
            </DialogTitle>
            <DialogDescription className="text-center">
              Congratulations! Your store is now visible to customers
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
              <div className="text-sm text-gray-600 mb-2 font-medium">Your store is live at:</div>
              <div className="font-mono text-sm break-all bg-white p-2 rounded border">
                {storeUrl}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={copyLink}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>

            <div className="text-center">
              <div className="text-sm font-medium text-gray-700 mb-3">Share your store:</div>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare('whatsapp')}
                  className="flex-1"
                >
                  📱 WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare('facebook')}
                  className="flex-1"
                >
                  📘 Facebook
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose} className="w-full" size="lg">
              View Live Store →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Not Ready Screen
  if (!isReady) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Complete Setup First</DialogTitle>
            <DialogDescription>
              You need to complete these steps before publishing your store:
            </DialogDescription>
          </DialogHeader>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <ul className="space-y-2">
              {missingSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span className="text-sm text-gray-700">{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} className="w-full">
              Complete Setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Confirmation Screen
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl">🚀 Publish Your Store?</DialogTitle>
          <DialogDescription>
            Your store will be live and accessible to customers worldwide
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
            <div className="text-sm text-gray-600 mb-1 font-medium">Your store will be live at:</div>
            <div className="font-mono text-sm font-semibold text-blue-900">{storeUrl}</div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="font-semibold mb-2 flex items-center gap-2 text-green-900">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              All requirements met
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm font-semibold mb-3 text-gray-900">Once published, customers can:</div>
            <ul className="text-sm space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Browse your products
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Place orders
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Contact you directly
              </li>
            </ul>
          </div>

          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
            💡 <strong>Tip:</strong> You can pause your store anytime from the dashboard.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPublishing} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing} className="flex-1 bg-green-600 hover:bg-green-700">
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                Publish Store
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## **COMPONENT 6: StatsCard** (Bonus)

**File:** `src/components/dashboard/StatsCard.tsx`

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatsCard({ title, value, change, icon: Icon, trend = 'neutral' }: StatsCardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600'
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {change && (
              <p className={`text-sm mt-1 ${trendColors[trend]}`}>
                {change}
              </p>
            )}
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## ✅ **COMPONENTS COMPLETE!**

All reusable components are now ready. These components provide:

1. **StatusBadge** - Visual status indicators
2. **StoreCard** - Beautiful store cards with actions
3. **StoreGrid** - Responsive grid layout with empty state
4. **OnboardingChecklist** - Progress tracking with links
5. **PublishModal** - Multi-state modal for publishing
6. **StatsCard** - Dashboard statistics display

---

## 🎯 **NEXT STEPS**

Now you're ready to build the pages that use these components:

1. **All Stores Dashboard** - Uses StoreGrid, StatsCard
2. **Create Store Wizard** - Multi-step form
3. **Single Store Dashboard** - Uses OnboardingChecklist, StatsCard
4. **Settings Pages** - Form-based pages
5. **Preview Mode** - Store preview with banner

**Ready for Part 3: Page Implementations?**
