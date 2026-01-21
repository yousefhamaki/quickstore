# QuickStore Phase 2.2 - Multi-Store Frontend Implementation Guide

## 🎯 **OBJECTIVE**
Build a beautiful, modern frontend for QuickStore's multi-store management system. The backend (Phase 2.1) is complete and functional. Now create an intuitive UI for merchants to manage multiple stores.

---

## 📋 **PREREQUISITES**

### **Backend Status:**
✅ All API endpoints functional
✅ Store CRUD operations working
✅ Publishing system implemented
✅ Onboarding checklist ready
✅ Preview token generation working

### **Frontend Stack:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- React Query (TanStack Query)
- react-hook-form + Zod
- Cloudinary (for image uploads)
- Sonner (for toast notifications)

---

## 🚀 **IMPLEMENTATION ROADMAP**

### **Phase 2.2A: Dashboard Foundation (Days 1-2)**
1. All Stores Dashboard page
2. Store Grid/Card components
3. API integration with React Query
4. Empty state

### **Phase 2.2B: Create Store Wizard (Days 3-4)**
5. Multi-step form component
6. Form validation with Zod
7. Cloudinary integration
8. Subdomain availability check

### **Phase 2.2C: Single Store Dashboard (Days 5-6)**
9. Store layout with navigation
10. Onboarding checklist component
11. Dashboard stats cards

### **Phase 2.2D: Settings Pages (Days 7-8)**
12. General settings
13. Payment settings
14. Shipping settings
15. Policies settings

### **Phase 2.2E: Preview & Publish (Days 9-10)**
16. Preview mode implementation
17. Go Live validation & modal
18. Success screen with share options

---

## 📁 **PROJECT STRUCTURE**

```
frontend/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── page.tsx                    # All Stores Dashboard
│   │   │   ├── layout.tsx                  # Dashboard Layout
│   │   │   └── stores/
│   │   │       ├── new/
│   │   │       │   └── page.tsx            # Create Store Wizard
│   │   │       └── [storeId]/
│   │   │           ├── layout.tsx          # Store Layout
│   │   │           ├── page.tsx            # Store Dashboard
│   │   │           ├── products/           # Phase 2.3
│   │   │           ├── orders/             # Phase 2.3
│   │   │           └── settings/
│   │   │               ├── general/
│   │   │               │   └── page.tsx
│   │   │               ├── payments/
│   │   │               │   └── page.tsx
│   │   │               ├── shipping/
│   │   │               │   └── page.tsx
│   │   │               └── policies/
│   │   │                   └── page.tsx
│   │   └── preview/
│   │       └── [storeId]/
│   │           └── page.tsx                # Preview Mode
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── StoreCard.tsx
│   │   │   ├── StoreGrid.tsx
│   │   │   ├── OnboardingChecklist.tsx
│   │   │   ├── PublishModal.tsx
│   │   │   └── StatsCard.tsx
│   │   ├── stores/
│   │   │   ├── CreateStoreWizard.tsx
│   │   │   ├── StoreNavigation.tsx
│   │   │   └── StatusBadge.tsx
│   │   └── ui/                             # shadcn components
│   ├── lib/
│   │   ├── api/
│   │   │   └── stores.ts                   # Store API client
│   │   ├── hooks/
│   │   │   ├── useStores.ts
│   │   │   ├── useStore.ts
│   │   │   └── useStoreChecklist.ts
│   │   ├── schemas/
│   │   │   └── store.ts                    # Zod schemas
│   │   └── utils.ts
│   └── types/
│       └── store.ts                        # TypeScript types
```

---

## 🔧 **STEP-BY-STEP IMPLEMENTATION**

---

## **STEP 1: Install Dependencies**

```bash
cd quickstore/frontend

# Install React Query
npm install @tanstack/react-query

# Install form libraries
npm install react-hook-form @hookform/resolvers zod

# Install toast notifications
npm install sonner

# Install color picker
npm install react-colorful

# Install rich text editor (for policies)
npm install @tiptap/react @tiptap/starter-kit

# Install icons (if not already)
npm install lucide-react
```

---

## **STEP 2: Setup React Query Provider**

**File:** `src/app/providers.tsx`

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 1 minute
                refetchOnWindowFocus: false,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <Toaster position="top-right" richColors />
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
```

**Update:** `src/app/layout.tsx`

```typescript
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
```

---

## **STEP 3: Create TypeScript Types**

**File:** `src/types/store.ts`

```typescript
export interface Store {
    _id: string;
    ownerId: string;
    name: string;
    slug: string;
    description?: string;
    logo?: {
        url: string;
        publicId: string;
    };
    favicon?: {
        url: string;
        publicId: string;
    };
    status: 'draft' | 'live' | 'paused';
    isPublished: boolean;
    publishedAt?: Date;
    branding: {
        primaryColor: string;
        secondaryColor: string;
        fontFamily: string;
        bannerImage?: {
            url: string;
            publicId: string;
        };
    };
    contact: {
        email?: string;
        phone?: string;
        address?: string;
        whatsapp?: string;
        facebook?: string;
        instagram?: string;
    };
    domain: {
        type: 'subdomain' | 'custom';
        subdomain: string;
        customDomain?: string;
        isVerified: boolean;
    };
    settings: {
        currency: string;
        language: string;
        timezone: string;
        payment: {
            methods: string[];
            bankDetails?: {
                bankName: string;
                accountNumber: string;
                accountName: string;
            };
            instapayNumber?: string;
            vcashNumber?: string;
        };
        shipping: {
            enabled: boolean;
            zones: ShippingZone[];
        };
        tax: {
            enabled: boolean;
            rate: number;
            includedInPrice: boolean;
        };
        policies: {
            returnPolicy?: string;
            privacyPolicy?: string;
            termsOfService?: string;
            shippingPolicy?: string;
        };
    };
    theme: {
        name: string;
        customizations: Record<string, any>;
    };
    stats: {
        totalProducts: number;
        totalOrders: number;
        totalRevenue: number;
        totalCustomers: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface ShippingZone {
    name: string;
    cities: string[];
    rate: number;
    freeShippingThreshold: number;
}

export interface OnboardingChecklist {
    checklist: {
        storeInfo: ChecklistItem;
        branding: ChecklistItem;
        products: ChecklistItem & { current: number; target: number };
        payment: ChecklistItem;
        shipping: ChecklistItem;
        policies: ChecklistItem;
    };
    progress: {
        completed: number;
        total: number;
        percentage: number;
    };
}

export interface ChecklistItem {
    completed: boolean;
    label: string;
}

export interface CreateStoreData {
    name: string;
    description?: string;
    contact?: Partial<Store['contact']>;
    branding?: Partial<Store['branding']>;
}
```

---

## **STEP 4: Create Store API Client**

**File:** `src/lib/api/stores.ts`

```typescript
import api from '@/services/api';
import { Store, CreateStoreData, OnboardingChecklist } from '@/types/store';

export async function getStores(): Promise<Store[]> {
    const response = await api.get('/stores');
    return response.data;
}

export async function getStore(id: string): Promise<Store> {
    const response = await api.get(`/stores/${id}`);
    return response.data;
}

export async function createStore(data: CreateStoreData): Promise<Store> {
    const response = await api.post('/stores', data);
    return response.data;
}

export async function updateStore(id: string, data: Partial<Store>): Promise<Store> {
    const response = await api.put(`/stores/${id}`, data);
    return response.data;
}

export async function deleteStore(id: string): Promise<void> {
    await api.delete(`/stores/${id}`);
}

export async function publishStore(id: string): Promise<{ message: string; store: Store; storeUrl: string }> {
    const response = await api.post(`/stores/${id}/publish`);
    return response.data;
}

export async function unpublishStore(id: string): Promise<Store> {
    const response = await api.post(`/stores/${id}/unpublish`);
    return response.data;
}

export async function pauseStore(id: string): Promise<Store> {
    const response = await api.post(`/stores/${id}/pause`);
    return response.data;
}

export async function resumeStore(id: string): Promise<Store> {
    const response = await api.post(`/stores/${id}/resume`);
    return response.data;
}

export async function generatePreviewToken(id: string): Promise<{ token: string; expiresAt: Date; previewUrl: string }> {
    const response = await api.post(`/stores/${id}/preview-token`);
    return response.data;
}

export async function checkSubdomainAvailability(subdomain: string): Promise<{ available: boolean; message: string }> {
    const response = await api.get(`/stores/check-subdomain/${subdomain}`);
    return response.data;
}

export async function getStoreChecklist(id: string): Promise<OnboardingChecklist> {
    const response = await api.get(`/stores/${id}/checklist`);
    return response.data;
}
```

---

## **STEP 5: Create React Query Hooks**

**File:** `src/lib/hooks/useStores.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStores, createStore, deleteStore } from '@/lib/api/stores';
import { toast } from 'sonner';
import type { CreateStoreData } from '@/types/store';

export function useStores() {
    return useQuery({
        queryKey: ['stores'],
        queryFn: getStores,
    });
}

export function useCreateStore() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateStoreData) => createStore(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            toast.success('Store created successfully!');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create store');
        },
    });
}

export function useDeleteStore() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteStore(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            toast.success('Store deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete store');
        },
    });
}
```

**File:** `src/lib/hooks/useStore.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStore, updateStore, publishStore, pauseStore, resumeStore } from '@/lib/api/stores';
import { toast } from 'sonner';
import type { Store } from '@/types/store';

export function useStore(id: string) {
    return useQuery({
        queryKey: ['store', id],
        queryFn: () => getStore(id),
        enabled: !!id,
    });
}

export function useUpdateStore(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<Store>) => updateStore(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store', id] });
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            toast.success('Store updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update store');
        },
    });
}

export function usePublishStore(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => publishStore(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store', id] });
            queryClient.invalidateQueries({ queryKey: ['stores'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to publish store');
        },
    });
}

export function usePauseStore(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => pauseStore(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store', id] });
            toast.success('Store paused');
        },
    });
}

export function useResumeStore(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => resumeStore(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store', id] });
            toast.success('Store resumed');
        },
    });
}
```

**File:** `src/lib/hooks/useStoreChecklist.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { getStoreChecklist } from '@/lib/api/stores';

export function useStoreChecklist(storeId: string) {
    return useQuery({
        queryKey: ['store-checklist', storeId],
        queryFn: () => getStoreChecklist(storeId),
        enabled: !!storeId,
    });
}
```

---

## **STEP 6: Create Zod Schemas**

**File:** `src/lib/schemas/store.ts`

```typescript
import { z } from 'zod';

export const createStoreSchema = z.object({
    name: z.string().min(3, 'Store name must be at least 3 characters'),
    description: z.string().optional(),
    category: z.string().optional(),
    logo: z.object({
        url: z.string(),
        publicId: z.string(),
    }).optional(),
    branding: z.object({
        primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
        secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
        fontFamily: z.string(),
    }).optional(),
    contact: z.object({
        email: z.string().email('Invalid email').optional(),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
        address: z.string().optional(),
        facebook: z.string().url('Invalid URL').optional(),
        instagram: z.string().optional(),
    }).optional(),
    domain: z.object({
        subdomain: z.string()
            .min(3, 'Subdomain must be at least 3 characters')
            .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),
    }).optional(),
});

export type CreateStoreFormData = z.infer<typeof createStoreSchema>;
```

---

**Continue to Part 2 for component implementations...**

This guide provides the foundation. Would you like me to continue with:
1. Component implementations (StoreCard, StoreGrid, etc.)
2. Page implementations (Dashboard, Create Store Wizard, etc.)
3. All remaining steps?

Let me know and I'll create the complete implementation guide!
