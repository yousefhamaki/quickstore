# QuickStore Phase 2.2 - Part 3: Page Implementations

## 📄 **PAGE IMPLEMENTATIONS**

This guide covers all page implementations for the multi-store dashboard.

---

## **PAGE 1: All Stores Dashboard**

**File:** `src/app/dashboard/page.tsx`

```tsx
'use client';

import { useStores, usePauseStore, useResumeStore } from '@/lib/hooks/useStores';
import { useAuth } from '@/context/AuthContext';
import { StoreGrid } from '@/components/dashboard/StoreGrid';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PublishModal } from '@/components/dashboard/PublishModal';
import { usePublishStore } from '@/lib/hooks/useStore';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stores, isLoading } = useStores();
  const [publishingStoreId, setPublishingStoreId] = useState<string | null>(null);

  const pauseMutation = usePauseStore(publishingStoreId || '');
  const resumeMutation = useResumeStore(publishingStoreId || '');
  const publishMutation = usePublishStore(publishingStoreId || '');

  const handlePause = async (storeId: string) => {
    try {
      await pauseMutation.mutateAsync();
      toast.success('Store paused successfully');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleResume = async (storeId: string) => {
    try {
      await resumeMutation.mutateAsync();
      toast.success('Store resumed successfully');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handlePublish = (storeId: string) => {
    setPublishingStoreId(storeId);
  };

  const confirmPublish = async () => {
    if (!publishingStoreId) return;
    await publishMutation.mutateAsync();
    setPublishingStoreId(null);
  };

  const publishingStore = stores?.find(s => s._id === publishingStoreId);

  // Get subscription info
  const storeCount = stores?.length || 0;
  const maxStores = user?.subscriptionPlan?.maxStores || 1;
  const canCreateMore = storeCount < maxStores;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">My Stores</h1>
              <p className="text-gray-600 mt-1">
                Manage all your online stores in one place
              </p>
            </div>
            <Button asChild size="lg" disabled={!canCreateMore}>
              <Link href="/dashboard/stores/new">
                <Plus className="w-5 h-5 mr-2" />
                Create New Store
              </Link>
            </Button>
          </div>

          {/* Store Count & Upgrade */}
          <div className="flex items-center gap-4 mt-4">
            <div className="bg-white rounded-lg px-4 py-2 border-2 border-gray-200">
              <span className="text-sm text-gray-600">Stores: </span>
              <span className="font-bold text-lg">
                {storeCount}/{maxStores}
              </span>
            </div>

            {!canCreateMore && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="text-sm text-amber-800">
                  Store limit reached.
                </span>
                <Button variant="link" size="sm" asChild className="text-amber-700 font-semibold">
                  <Link href="/merchant/subscribe">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Upgrade Plan
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Store Grid */}
        <StoreGrid
          stores={stores || []}
          isLoading={isLoading}
          onPause={handlePause}
          onResume={handleResume}
          onPublish={handlePublish}
        />

        {/* Publish Modal */}
        {publishingStore && (
          <PublishModal
            isOpen={!!publishingStoreId}
            onClose={() => setPublishingStoreId(null)}
            storeUrl={`https://${publishingStore.domain.subdomain}.quickstore.com`}
            storeName={publishingStore.name}
            onConfirm={confirmPublish}
            isReady={true} // TODO: Check with checklist
            missingSteps={[]}
          />
        )}
      </div>
    </div>
  );
}
```

---

## **PAGE 2: Create Store Wizard**

**File:** `src/app/dashboard/stores/new/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateStore } from '@/lib/hooks/useStores';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { checkSubdomainAvailability } from '@/lib/api/stores';

const createStoreSchema = z.object({
  name: z.string().min(3, 'Store name must be at least 3 characters'),
  description: z.string().optional(),
  category: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  fontFamily: z.string(),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  facebook: z.string().url('Invalid URL').optional().or(z.literal('')),
  instagram: z.string().optional(),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
});

type FormData = z.infer<typeof createStoreSchema>;

const steps = [
  { id: 1, name: 'Basic Info', description: 'Store name and description' },
  { id: 2, name: 'Branding', description: 'Colors and fonts' },
  { id: 3, name: 'Contact', description: 'Contact information' },
  { id: 4, name: 'Domain', description: 'Your store URL' },
];

export default function CreateStorePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const router = useRouter();
  const createMutation = useCreateStore();

  const form = useForm<FormData>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      fontFamily: 'Inter',
      email: '',
      phone: '',
      whatsapp: '',
      address: '',
      facebook: '',
      instagram: '',
      subdomain: '',
    },
  });

  const { watch, setValue } = form;
  const storeName = watch('name');
  const subdomain = watch('subdomain');

  // Auto-generate subdomain from store name
  const generateSubdomain = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setValue('subdomain', slug);
    setSubdomainAvailable(null);
  };

  // Check subdomain availability
  const checkSubdomain = async () => {
    if (!subdomain || subdomain.length < 3) return;
    
    setIsCheckingSubdomain(true);
    try {
      const result = await checkSubdomainAvailability(subdomain);
      setSubdomainAvailable(result.available);
      if (!result.available) {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to check subdomain availability');
    } finally {
      setIsCheckingSubdomain(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const storeData = {
        name: data.name,
        description: data.description,
        contact: {
          email: data.email,
          phone: data.phone,
          whatsapp: data.whatsapp,
          address: data.address,
          facebook: data.facebook,
          instagram: data.instagram,
        },
        branding: {
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          fontFamily: data.fontFamily,
        },
        domain: {
          subdomain: data.subdomain,
        },
      };

      const store = await createMutation.mutateAsync(storeData);
      toast.success('Store created successfully!');
      router.push(`/dashboard/stores/${store._id}`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const nextStep = async () => {
    const fieldsToValidate = {
      1: ['name'],
      2: ['primaryColor', 'secondaryColor', 'fontFamily'],
      3: [],
      4: ['subdomain'],
    }[currentStep] as (keyof FormData)[];

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      if (currentStep === 4) {
        form.handleSubmit(onSubmit)();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl font-bold text-gray-900">Create New Store</h1>
          <p className="text-gray-600 mt-2">
            Follow the steps below to set up your online store
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex-1 text-center ${
                  step.id === currentStep ? 'text-blue-600 font-semibold' : 'text-gray-400'
                }`}
              >
                <div className="text-sm">{step.name}</div>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
          <div className="text-sm text-gray-500 mt-2 text-center">
            Step {currentStep} of {steps.length}
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].name}</CardTitle>
            <CardDescription>{steps[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Store Name *</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="My Awesome Store"
                      onBlur={(e) => generateSubdomain(e.target.value)}
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.name.message}
                      </p>
                    )}
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

                  <div>
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      {...form.register('category')}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select a category</option>
                      <option value="fashion">Fashion & Clothing</option>
                      <option value="electronics">Electronics</option>
                      <option value="food">Food & Beverages</option>
                      <option value="beauty">Beauty & Cosmetics</option>
                      <option value="home">Home & Garden</option>
                      <option value="sports">Sports & Outdoors</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Step 2: Branding */}
              {currentStep === 2 && (
                <div className="space-y-4">
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
                          value={watch('primaryColor')}
                          onChange={(e) => setValue('primaryColor', e.target.value)}
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
                          value={watch('secondaryColor')}
                          onChange={(e) => setValue('secondaryColor', e.target.value)}
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

                  {/* Preview */}
                  <div className="border rounded-lg p-4" style={{
                    backgroundColor: watch('primaryColor') + '10',
                    borderColor: watch('primaryColor'),
                  }}>
                    <h3 className="font-bold text-lg mb-2" style={{
                      color: watch('primaryColor'),
                      fontFamily: watch('fontFamily'),
                    }}>
                      {storeName || 'Your Store Name'}
                    </h3>
                    <p style={{ fontFamily: watch('fontFamily') }}>
                      This is how your store will look with these colors and font.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Contact */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...form.register('email')}
                        placeholder="contact@example.com"
                      />
                      {form.formState.errors.email && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        {...form.register('phone')}
                        placeholder="+20 123 456 7890"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="whatsapp">WhatsApp Number</Label>
                    <Input
                      id="whatsapp"
                      {...form.register('whatsapp')}
                      placeholder="+20 123 456 7890"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      {...form.register('address')}
                      placeholder="123 Main St, Cairo, Egypt"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="facebook">Facebook URL</Label>
                      <Input
                        id="facebook"
                        {...form.register('facebook')}
                        placeholder="https://facebook.com/yourpage"
                      />
                    </div>

                    <div>
                      <Label htmlFor="instagram">Instagram Username</Label>
                      <Input
                        id="instagram"
                        {...form.register('instagram')}
                        placeholder="@yourstore"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Domain */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="subdomain">Choose Your Subdomain *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="subdomain"
                        {...form.register('subdomain')}
                        placeholder="my-store"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={checkSubdomain}
                        disabled={isCheckingSubdomain || !subdomain}
                      >
                        {isCheckingSubdomain ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Check'
                        )}
                      </Button>
                    </div>
                    {form.formState.errors.subdomain && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.subdomain.message}
                      </p>
                    )}
                    {subdomainAvailable === true && (
                      <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Subdomain is available!
                      </p>
                    )}
                    {subdomainAvailable === false && (
                      <p className="text-sm text-red-500 mt-1">
                        Subdomain is already taken
                      </p>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Your store will be available at:</p>
                    <p className="font-mono font-semibold text-blue-900">
                      https://{subdomain || 'your-subdomain'}.quickstore.com
                    </p>
                  </div>

                  <div className="bg-gray-50 border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">💡 Custom Domain (Pro/Enterprise)</h4>
                    <p className="text-sm text-gray-600">
                      Upgrade to Pro or Enterprise plan to use your own custom domain
                      (e.g., www.yourstore.com)
                    </p>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <Button
            onClick={nextStep}
            disabled={createMutation.isPending || (currentStep === 4 && subdomainAvailable !== true)}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : currentStep === 4 ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Create Store
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

**Continue to next message for remaining pages...**
