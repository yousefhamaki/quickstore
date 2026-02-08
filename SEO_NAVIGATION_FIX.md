# ✅ SEO Center Navigation Fix

## Issue
The "Edit SEO Settings" button on the Marketing page (`/dashboard/stores/[storeId]/marketing`) was not clickable.

## Root Cause
1. The button was missing an `onClick` handler
2. The SEO page was created in the wrong directory (`/merchant/stores/[storeId]/seo/` instead of `/dashboard/stores/[storeId]/seo/`)

## Fixes Applied

### 1. Added Navigation to Marketing Page
**File:** `frontend/src/app/[locale]/dashboard/stores/[storeId]/marketing/page.tsx`

**Change:**
```tsx
// Before (line 184)
<Button className="..." variant="outline">
    Edit SEO Settings
</Button>

// After
<Button 
    className="..." 
    variant="outline"
    onClick={() => router.push(`/dashboard/stores/${storeId}/seo`)}
>
    Edit SEO Settings
</Button>
```

### 2. Created SEO Page in Correct Location
**File:** `frontend/src/app/[locale]/dashboard/stores/[storeId]/seo/page.tsx`

**Features:**
- ✅ Uses `useFeatureAccess` hook for plan gating
- ✅ Matches dashboard styling (rounded-3xl, uppercase headings, etc.)
- ✅ Uses Next.js 15 `use(params)` pattern
- ✅ Integrates with existing auth context
- ✅ Shows upgrade prompt for non-Professional plans
- ✅ 4 tabs: Health, Global Settings, Product SEO, Technical SEO

## Testing

1. Navigate to: `http://localhost:3000/en/dashboard/stores/[storeId]/marketing`
2. Click "Edit SEO Settings" button in the SEO Center card
3. Should navigate to: `http://localhost:3000/en/dashboard/stores/[storeId]/seo`
4. If on Professional+ plan: Shows full SEO Center
5. If on Free/Starter plan: Shows upgrade prompt

## Files Modified/Created

1. ✅ Modified: `frontend/src/app/[locale]/dashboard/stores/[storeId]/marketing/page.tsx`
   - Added `onClick` handler to SEO button

2. ✅ Created: `frontend/src/app/[locale]/dashboard/stores/[storeId]/seo/page.tsx`
   - Full SEO Center page with plan gating
   - Matches dashboard design system
   - Integrates with existing hooks

## Status
✅ **FIXED** - SEO Settings button is now clickable and navigates to the correct page
