# QuickStore Phase 2.2 - Part 3B: More Page Implementations

## **PAGE 3: Single Store Dashboard**

**File:** `src/app/dashboard/stores/[storeId]/page.tsx`

```tsx
'use client';

import { use } from 'react';
import { useStore } from '@/lib/hooks/useStore';
import { useStoreChecklist } from '@/lib/hooks/useStoreChecklist';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart, DollarSign, Users, Plus, Eye, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { PublishModal } from '@/components/dashboard/PublishModal';
import { usePublishStore } from '@/lib/hooks/useStore';

export default function StoreDashboardPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const { data: store, isLoading } = useStore(storeId);
  const { data: checklist } = useStoreChecklist(storeId);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const publishMutation = usePublishStore(storeId);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!store) {
    return <div className="p-8">Store not found</div>;
  }

  const isDraft = store.status === 'draft';
  const isLive = store.status === 'live';

  const handleGoLive = async () => {
    setShowPublishModal(true);
  };

  const confirmPublish = async () => {
    await publishMutation.mutateAsync();
    setShowPublishModal(false);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{store.name}</h1>
            <StatusBadge status={store.status} />
          </div>
          <p className="text-gray-600">
            {store.domain.subdomain}.quickstore.com
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/preview/${storeId}`}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/stores/${storeId}/settings/general`}>
              <SettingsIcon className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Draft Banner */}
      {isDraft && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-amber-900">🚧 Your store is in DRAFT mode</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Complete the setup checklist below to publish your store
                </p>
              </div>
              <Button onClick={handleGoLive} className="bg-green-600 hover:bg-green-700">
                Go Live
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Checklist (for draft stores) */}
      {isDraft && checklist && (
        <OnboardingChecklist
          checklist={checklist}
          storeId={storeId}
          onGoLive={handleGoLive}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Products"
          value={store.stats.totalProducts}
          icon={Package}
          change={isLive ? '+12 this week' : undefined}
          trend="up"
        />
        <StatsCard
          title="Orders"
          value={store.stats.totalOrders}
          icon={ShoppingCart}
          change={isLive ? '+5 today' : undefined}
          trend="up"
        />
        <StatsCard
          title="Revenue"
          value={`${store.stats.totalRevenue.toLocaleString()} EGP`}
          icon={DollarSign}
          change={isLive ? '+2,500 today' : undefined}
          trend="up"
        />
        <StatsCard
          title="Customers"
          value={store.stats.totalCustomers}
          icon={Users}
          change={isLive ? '+8 this week' : undefined}
          trend="up"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="h-20">
              <Link href={`/dashboard/stores/${storeId}/products/new`}>
                <div className="text-center">
                  <Plus className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-semibold">Add Product</div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20">
              <Link href={`/dashboard/stores/${storeId}/orders`}>
                <div className="text-center">
                  <ShoppingCart className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-semibold">View Orders</div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20">
              <Link href={`/dashboard/stores/${storeId}/settings/general`}>
                <div className="text-center">
                  <SettingsIcon className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-semibold">Store Settings</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity (if live) */}
      {isLive && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-center py-8">
              No recent activity
            </p>
          </CardContent>
        </Card>
      )}

      {/* Publish Modal */}
      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        storeUrl={`https://${store.domain.subdomain}.quickstore.com`}
        storeName={store.name}
        onConfirm={confirmPublish}
        isReady={checklist?.progress.percentage === 100}
        missingSteps={
          checklist
            ? Object.entries(checklist.checklist)
                .filter(([_, item]) => !item.completed)
                .map(([_, item]) => item.label)
            : []
        }
      />
    </div>
  );
}
```

---

## **PAGE 4: Store Layout with Navigation**

**File:** `src/app/dashboard/stores/[storeId]/layout.tsx`

```tsx
'use client';

import { use } from 'react';
import { useStore } from '@/lib/hooks/useStore';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Settings,
  ArrowLeft 
} from 'lucide-react';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';

export default function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = use(params);
  const { data: store } = useStore(storeId);
  const pathname = usePathname();

  const navigation = [
    { name: 'Overview', href: `/dashboard/stores/${storeId}`, icon: LayoutDashboard },
    { name: 'Products', href: `/dashboard/stores/${storeId}/products`, icon: Package },
    { name: 'Orders', href: `/dashboard/stores/${storeId}/orders`, icon: ShoppingCart },
    { name: 'Customers', href: `/dashboard/stores/${storeId}/customers`, icon: Users },
    { name: 'Analytics', href: `/dashboard/stores/${storeId}/analytics`, icon: BarChart3 },
    { name: 'Settings', href: `/dashboard/stores/${storeId}/settings/general`, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  All Stores
                </Link>
              </Button>
              {store && (
                <>
                  <div className="h-6 w-px bg-gray-300" />
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-lg">{store.name}</h2>
                    <StatusBadge status={store.status} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
```

---

## **PAGE 5: General Settings**

**File:** `src/app/dashboard/stores/[storeId]/settings/general/page.tsx`

```tsx
'use client';

import { use } from 'react';
import { useStore, useUpdateStore } from '@/lib/hooks/useStore';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function GeneralSettingsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const { data: store, isLoading } = useStore(storeId);
  const updateMutation = useUpdateStore(storeId);

  const form = useForm({
    values: store ? {
      name: store.name,
      description: store.description || '',
      primaryColor: store.branding.primaryColor,
      secondaryColor: store.branding.secondaryColor,
      fontFamily: store.branding.fontFamily,
    } : undefined,
  });

  const onSubmit = async (data: any) => {
    try {
      await updateMutation.mutateAsync({
        name: data.name,
        description: data.description,
        branding: {
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          fontFamily: data.fontFamily,
        },
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!store) {
    return <div className="p-8">Store not found</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">General Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your store's basic information and branding
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Store Information */}
        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
            <CardDescription>
              Basic details about your store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Store Name</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="My Awesome Store"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Tell customers about your store..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>
              Customize your store's appearance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    {...form.register('primaryColor')}
                    className="w-20 h-10"
                  />
                  <Input
                    value={form.watch('primaryColor')}
                    onChange={(e) => form.setValue('primaryColor', e.target.value)}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    {...form.register('secondaryColor')}
                    className="w-20 h-10"
                  />
                  <Input
                    value={form.watch('secondaryColor')}
                    onChange={(e) => form.setValue('secondaryColor', e.target.value)}
                    placeholder="#1E40AF"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="fontFamily">Font Family</Label>
              <select
                id="fontFamily"
                {...form.register('fontFamily')}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Playfair Display">Playfair Display</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Open Sans">Open Sans</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Domain */}
        <Card>
          <CardHeader>
            <CardTitle>Domain</CardTitle>
            <CardDescription>
              Your store's web address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 border">
              <Label>Current Domain</Label>
              <p className="font-mono font-semibold mt-1">
                https://{store.domain.subdomain}.quickstore.com
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Contact support to change your subdomain
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            size="lg"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

---

## **PAGE 6: Preview Mode**

**File:** `src/app/preview/[storeId]/page.tsx`

```tsx
'use client';

import { use } from 'react';
import { useStore } from '@/lib/hooks/useStore';
import { Button } from '@/components/ui/button';
import { X, Rocket } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PublishModal } from '@/components/dashboard/PublishModal';
import { usePublishStore } from '@/lib/hooks/useStore';

export default function PreviewPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const { data: store } = useStore(storeId);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const publishMutation = usePublishStore(storeId);

  if (!store) {
    return <div>Loading...</div>;
  }

  const handleGoLive = () => {
    setShowPublishModal(true);
  };

  const confirmPublish = async () => {
    await publishMutation.mutateAsync();
    setShowPublishModal(false);
  };

  return (
    <div className="min-h-screen">
      {/* Preview Banner */}
      <div className="bg-amber-500 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-600 rounded-full p-2">
              🔒
            </div>
            <div>
              <h3 className="font-semibold">PREVIEW MODE</h3>
              <p className="text-sm text-amber-100">
                This is how your store will look to customers
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleGoLive}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Go Live
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/dashboard/stores/${storeId}`}>
                <X className="w-4 h-4 mr-2" />
                Exit Preview
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Storefront Preview */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h1 className="text-4xl font-bold mb-4">{store.name}</h1>
          <p className="text-gray-600 mb-8">{store.description}</p>
          
          <div className="bg-gray-100 rounded-lg p-12">
            <p className="text-gray-500">
              Storefront preview will be displayed here
            </p>
            <p className="text-sm text-gray-400 mt-2">
              (Storefront implementation coming in Phase 2.4)
            </p>
          </div>
        </div>
      </div>

      {/* Publish Modal */}
      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        storeUrl={`https://${store.domain.subdomain}.quickstore.com`}
        storeName={store.name}
        onConfirm={confirmPublish}
        isReady={true}
        missingSteps={[]}
      />
    </div>
  );
}
```

---

## ✅ **ALL PAGES COMPLETE!**

You now have all the essential pages for Phase 2.2:

1. ✅ **All Stores Dashboard** - Grid view with actions
2. ✅ **Create Store Wizard** - 4-step form
3. ✅ **Single Store Dashboard** - Overview with checklist
4. ✅ **Store Layout** - Navigation and header
5. ✅ **General Settings** - Store info and branding
6. ✅ **Preview Mode** - Store preview with banner

---

## 🎯 **NEXT STEPS**

### **Additional Settings Pages** (Optional):
- Payment Settings (`settings/payments/page.tsx`)
- Shipping Settings (`settings/shipping/page.tsx`)
- Policies Settings (`settings/policies/page.tsx`)

### **Testing:**
1. Install all dependencies
2. Create all files from Parts 1, 2, and 3
3. Test the complete flow:
   - View all stores
   - Create new store
   - View store dashboard
   - Update settings
   - Preview store
   - Publish store

---

**Status:** ✅ **Phase 2.2 Frontend Implementation COMPLETE!**
