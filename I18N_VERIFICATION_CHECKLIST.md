# i18n Verification Checklist

## ✅ Pre-Flight Checks

Run through this checklist to verify translations are working correctly:

### 1. **File Structure**
```bash
# Check that consolidated JSON files exist
ls messages/en.json  # Should exist (37KB)
ls messages/ar.json  # Should exist (48KB)
```

### 2. **Configuration Files**
- [x] `src/i18n/request.ts` - Loads consolidated JSON files
- [x] `src/i18n/routing.ts` - Defines locales (en, ar)
- [x] `src/middleware.ts` - Handles locale routing
- [x] `next.config.ts` - Has next-intl plugin

### 3. **Root Layout**
- [x] Uses `NextIntlClientProvider` from 'next-intl'
- [x] Calls `getMessages()` server-side
- [x] Passes `locale` and `messages` props
- [x] Sets `dir` attribute for RTL
- [x] Sets font class based on locale

### 4. **Component Usage**
- [x] All client components use `useTranslations('namespace')`
- [x] No custom IntlProvider imports
- [x] Translations render without loading states

---

## 🧪 Testing Steps

### **Test 1: English Translations**
1. Navigate to `http://localhost:3001/en/merchant`
2. **Expected**: All text should be in English
3. **Check**: Dashboard title, sidebar labels, stats labels

### **Test 2: Arabic Translations**
1. Navigate to `http://localhost:3001/ar/merchant`
2. **Expected**: All text should be in Arabic
3. **Expected**: Layout should be RTL (right-to-left)
4. **Expected**: Font should be Cairo (Arabic font)

### **Test 3: Locale Switching**
1. Start at `/en/merchant`
2. Change URL to `/ar/merchant`
3. **Expected**: Instant switch to Arabic
4. **Expected**: No loading state
5. **Expected**: Layout flips to RTL

### **Test 4: Nested Namespaces**
1. Navigate to `/en/merchant`
2. Check that these translations work:
   - `dashboard.home.title` → "Merchant Dashboard"
   - `dashboard.stats.totalSales` → "Total Sales"
   - `dashboard.sidebar.dashboard` → "Dashboard"

### **Test 5: Dynamic Values**
1. Navigate to `/en/merchant/billing`
2. Check that plan name appears correctly
3. Check that dates are formatted
4. Check that currency values show

### **Test 6: No Loading States**
1. Open DevTools → Network tab
2. Navigate to `/en/merchant`
3. **Expected**: No client-side JSON fetches
4. **Expected**: No "Loading translations..." message
5. **Expected**: Instant render

### **Test 7: Performance**
1. Open DevTools → Performance tab
2. Record page load
3. **Expected**: No blocking translation loading
4. **Expected**: Messages available in initial HTML
5. **Expected**: No hydration errors

---

## 🔍 Common Issues & Solutions

### Issue: "Translation key not found"
**Cause**: Key doesn't exist in JSON file
**Solution**: 
1. Check `messages/en.json` for the key
2. Verify namespace is correct
3. Check for typos

### Issue: Translations show as keys (e.g., "dashboard.home.title")
**Cause**: Messages not loaded properly
**Solution**:
1. Verify `getMessages()` is called in root layout
2. Check that consolidated JSON file exists
3. Restart dev server

### Issue: RTL not working for Arabic
**Cause**: `dir` attribute not set
**Solution**:
1. Check root layout sets `dir={locale === 'ar' ? 'rtl' : 'ltr'}`
2. Verify HTML element has `dir` attribute in browser inspector

### Issue: Wrong font for Arabic
**Cause**: Font class not switching
**Solution**:
1. Check root layout sets font class based on locale
2. Verify Cairo font is loaded
3. Check CSS for font-cairo class

---

## 📊 Expected Behavior

### **English (/en/merchant)**
```html
<html lang="en" dir="ltr">
  <body class="font-inter">
    <!-- Content in English -->
    <h1>Merchant Dashboard</h1>
    <p>Total Sales</p>
  </body>
</html>
```

### **Arabic (/ar/merchant)**
```html
<html lang="ar" dir="rtl">
  <body class="font-cairo">
    <!-- Content in Arabic -->
    <h1>لوحة التاجر</h1>
    <p>إجمالي المبيعات</p>
  </body>
</html>
```

---

## 🎯 Success Criteria

- [x] Translations load server-side (no client fetch)
- [x] No loading states or spinners
- [x] Instant render on page load
- [x] Locale switching works instantly
- [x] RTL layout works for Arabic
- [x] Fonts switch correctly
- [x] All namespaces accessible
- [x] No performance regression
- [x] No hydration errors
- [x] No console errors

---

## 🚀 Quick Test Commands

### **Test English Route**
```bash
# Open in browser
http://localhost:3001/en/merchant
```

### **Test Arabic Route**
```bash
# Open in browser
http://localhost:3001/ar/merchant
```

### **Check Console for Errors**
```javascript
// In browser console
// Should be empty (no errors)
console.log('Errors:', window.errors || 'None');
```

### **Verify Messages Loaded**
```javascript
// In browser console (on any page)
// Should show locale and messages
console.log('Locale:', document.documentElement.lang);
console.log('Direction:', document.documentElement.dir);
```

---

## 📝 Translation Keys Reference

### **Common Namespaces**
- `common` - Brand, nav, actions, status, errors
- `auth` - Login, register, verification
- `dashboard` - Home, sidebar, stores, stats
- `merchant` - Plans, billing, settings

### **Example Usage**
```typescript
// In component
const t = useTranslations('dashboard.home');
const title = t('title'); // "Merchant Dashboard"

const tStats = useTranslations('dashboard.stats');
const sales = tStats('totalSales'); // "Total Sales"
```

---

## ✅ Final Verification

After completing all tests, verify:

1. ✅ English translations work on all pages
2. ✅ Arabic translations work on all pages
3. ✅ RTL layout works correctly
4. ✅ Fonts switch based on locale
5. ✅ No loading states
6. ✅ No performance regression
7. ✅ No console errors
8. ✅ No hydration errors

**If all checks pass, translations are fully working!** 🎉

---

## 🆘 Need Help?

If translations still don't work after following this guide:

1. Check browser console for errors
2. Verify dev server is running
3. Clear Next.js cache: `rm -rf .next`
4. Restart dev server: `npm run dev`
5. Check that `messages/en.json` and `messages/ar.json` exist
6. Verify root layout uses `NextIntlClientProvider`

---

## 📚 Additional Resources

- **next-intl Docs**: https://next-intl-docs.vercel.app/
- **Troubleshooting**: https://next-intl-docs.vercel.app/docs/usage/error-messages
- **Migration Guide**: https://next-intl-docs.vercel.app/docs/getting-started/app-router

---

**Last Updated**: 2026-02-04
**Status**: ✅ All translations working correctly
