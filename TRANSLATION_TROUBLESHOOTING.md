# Translation Loading Issue - Troubleshooting Guide

## Problem
`MISSING_MESSAGE: Could not resolve 'landing' in messages for locale 'en'`

## Verification Steps

### 1. Check Translation Files Exist
```bash
# Both files should exist
messages/en.json  ✅
messages/ar.json  ✅
```

### 2. Verify JSON is Valid
```bash
node -e "console.log(Object.keys(require('./messages/en.json')))"
# Should output: brand, nav, actions, status, time, errors, success, loading, empty, footer, auth, dashboard, landing
```

### 3. Check i18n Configuration
File: `src/i18n/request.ts`
```typescript
export default getRequestConfig(async ({ locale }) => {
  if (!locale || !routing.locales.includes(locale as any)) {
    notFound();
  }

  return {
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
```

### 4. Clear All Caches
```bash
# Stop server
taskkill /F /IM node.exe /T

# Clear caches
Remove-Item -Recurse -Force .next,.turbopack

# Restart
npm run dev
```

## Common Issues

### Issue 1: Turbopack Cache
**Solution:** Clear `.next` and `.turbopack` folders

### Issue 2: Import Path Mismatch
**Solution:** Verify the path in `src/i18n/request.ts` is `../../messages/${locale}.json`

### Issue 3: JSON Syntax Error
**Solution:** Validate JSON files with `node -e "require('./messages/en.json')"`

### Issue 4: Missing Translations
**Solution:** Ensure both `en.json` and `ar.json` have the same structure

## Quick Fix Commands

```powershell
# 1. Kill all Node processes
taskkill /F /IM node.exe /T

# 2. Clear caches
cd frontend
Remove-Item -Recurse -Force .next,.turbopack -ErrorAction SilentlyContinue

# 3. Verify JSON
node -e "const en = require('./messages/en.json'); const ar = require('./messages/ar.json'); console.log('EN keys:', Object.keys(en)); console.log('AR keys:', Object.keys(ar)); console.log('Both have landing:', 'landing' in en && 'landing' in ar);"

# 4. Restart server
npm run dev
```

## Expected Output

When visiting `http://localhost:3000/en`:
- ✅ Hero section displays with "NEXT-GEN E-COMMERCE" badge
- ✅ Title shows "Build Your Store in Minutes."
- ✅ Features section displays
- ✅ No console errors

When visiting `http://localhost:3000/ar`:
- ✅ Hero section displays with "التجارة الإلكترونية من الجيل القادم" badge
- ✅ Title shows "أنشئ متجرك في دقائق."
- ✅ RTL layout active
- ✅ No console errors

## If Still Not Working

### Option 1: Hard Reload Browser
- Press `Ctrl + Shift + R` (Windows)
- Or `Cmd + Shift + R` (Mac)

### Option 2: Check Browser Console
- Open DevTools (F12)
- Check for any import errors
- Look for 404 errors on JSON files

### Option 3: Verify File Encoding
- Ensure JSON files are UTF-8 encoded
- No BOM (Byte Order Mark)

### Option 4: Manual Import Test
Create a test file: `src/test-translations.ts`
```typescript
import enMessages from '../messages/en.json';
import arMessages from '../messages/ar.json';

console.log('EN has landing:', 'landing' in enMessages);
console.log('AR has landing:', 'landing' in arMessages);
```

## Status After Fix

✅ Server running on http://localhost:3000
✅ Translation files valid
✅ Cache cleared
✅ Ready to test

**Test URLs:**
- English: http://localhost:3000/en
- Arabic: http://localhost:3000/ar
