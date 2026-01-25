# Buildora i18n Quick Reference Guide

## 🚀 Quick Start

### 1. Using Translations in Components

```tsx
'use client';

import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('common'); // or 'auth', 'dashboard', etc.
  
  return (
    <div>
      <h1>{t('nav.home')}</h1>
      <button>{t('actions.save')}</button>
    </div>
  );
}
```

### 2. Multiple Namespaces

```tsx
const t = useTranslations('common');
const tAuth = useTranslations('auth');
const tDashboard = useTranslations('dashboard');

return (
  <>
    <h1>{t('brand.name')}</h1>
    <p>{tAuth('login.title')}</p>
    <span>{tDashboard('sidebar.dashboard')}</span>
  </>
);
```

## 🎨 RTL Support

### Basic RTL Classes

```tsx
// Reverse flex direction
<div className="flex space-x-4 rtl:space-x-reverse">

// Rotate icons for RTL
<ChevronRight className="rtl:rotate-180" />

// Text alignment
<p className="text-left rtl:text-right">

// Margin flipping
<div className="ml-auto rtl:mr-auto rtl:ml-0">
```

### Common RTL Patterns

```tsx
// Navigation with icons
<nav className="flex items-center gap-4 rtl:flex-row-reverse">
  <Icon className="rtl:rotate-180" />
  <span>{t('label')}</span>
</nav>

// Sidebar positioning
<aside className="left-0 rtl:right-0 rtl:left-auto">

// Breadcrumbs
<div className="flex items-center">
  <span>Home</span>
  <ChevronRight className="mx-2 rtl:rotate-180" />
  <span>Products</span>
</div>
```

## 📁 Translation File Structure

```
messages/
├── en/
│   ├── common.json      # Brand, nav, actions, status, errors
│   ├── auth.json        # Login, register, verification
│   └── dashboard.json   # Sidebar, stores, stats
└── ar/
    ├── common.json
    ├── auth.json
    └── dashboard.json
```

## 🔑 Available Translation Keys

### Common (`common`)
- `brand.name` - "Buildora"
- `brand.tagline` - "Multi-Store E-commerce Platform"
- `brand.poweredBy` - "Powered by QuickStore"
- `nav.*` - Navigation items (home, features, pricing, etc.)
- `actions.*` - Common actions (save, cancel, delete, etc.)
- `status.*` - Status labels (active, pending, draft, etc.)
- `errors.*` - Error messages
- `success.*` - Success messages
- `loading.*` - Loading states
- `footer.*` - Footer content

### Auth (`auth`)
- `login.*` - Login form
- `register.*` - Registration form
- `verification.*` - Email verification
- `forgotPassword.*` - Password reset

### Dashboard (`dashboard`)
- `sidebar.*` - Sidebar navigation
- `stores.*` - Store management
- `stats.*` - Statistics labels
- `quickActions.*` - Quick action buttons
- `publish.*` - Publish modal

## 🌍 Language Switching

The language switcher is already integrated in:
- Desktop navbar (top right)
- Mobile navbar (hamburger menu)

Users can switch between English and Arabic, and their preference is saved in a cookie.

## ✅ Translation Checklist for New Components

- [ ] Import `useTranslations` from 'next-intl'
- [ ] Call `const t = useTranslations('namespace')`
- [ ] Replace ALL hardcoded strings with `t('key')`
- [ ] Add `rtl:space-x-reverse` to flex containers with spacing
- [ ] Add `rtl:rotate-180` to directional icons (arrows, chevrons)
- [ ] Test in both English and Arabic
- [ ] Verify RTL layout looks correct

## 🐛 Common Issues

### Issue: Translations not loading
**Solution:** Make sure the namespace is imported in `src/i18n.ts`:
```ts
messages: {
  ...(await import(`../messages/${locale}/common.json`)).default,
  auth: (await import(`../messages/${locale}/auth.json`)).default,
  dashboard: (await import(`../messages/${locale}/dashboard.json`)).default,
  // Add your new namespace here
}
```

### Issue: RTL layout broken
**Solution:** Check for:
- Missing `rtl:space-x-reverse` on flex containers
- Icons that need `rtl:rotate-180`
- Absolute positioning that needs `rtl:right-0 rtl:left-auto`

### Issue: Language not persisting
**Solution:** The language is stored in the `NEXT_LOCALE` cookie. Check browser cookies.

## 📝 Adding New Translations

1. **Create translation files:**
   ```bash
   messages/en/myfeature.json
   messages/ar/myfeature.json
   ```

2. **Add to i18n config:**
   ```ts
   // src/i18n.ts
   myfeature: (await import(`../messages/${locale}/myfeature.json`)).default,
   ```

3. **Use in component:**
   ```tsx
   const t = useTranslations('myfeature');
   ```

## 🎯 Best Practices

1. **Keep keys organized** - Group related translations
2. **Use descriptive keys** - `auth.login.title` not `auth.t1`
3. **Avoid concatenation** - Use complete sentences in translations
4. **Test RTL early** - Don't wait until the end
5. **Consistent naming** - Follow existing patterns

## 🔗 Resources

- [next-intl Docs](https://next-intl-docs.vercel.app/)
- [Tailwind RTL](https://tailwindcss.com/docs/hover-focus-and-other-states#rtl-support)
- [I18N_IMPLEMENTATION.md](./I18N_IMPLEMENTATION.md) - Full implementation details
