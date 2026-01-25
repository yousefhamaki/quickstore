# Translation File Structure - Important Notes

## ✅ RESOLVED: Translation Loading Issue

### Problem
Created separate `landing.json` files in `messages/en/` and `messages/ar/` folders, but the i18n configuration expects consolidated files.

### Solution
Merged the landing translations into the main consolidated files:
- `messages/en.json` ✅
- `messages/ar.json` ✅

---

## 📁 Current File Structure

### **Consolidated Files (USED by next-intl):**
```
messages/
├── en.json          ← All English translations (consolidated)
└── ar.json          ← All Arabic translations (consolidated)
```

### **Folder Structure (NOT USED, for organization only):**
```
messages/
├── en/
│   ├── common.json
│   ├── auth.json
│   ├── dashboard.json
│   └── landing.json
└── ar/
    ├── common.json
    ├── auth.json
    ├── dashboard.json
    └── landing.json
```

---

## 🔧 How It Works

### i18n Configuration (`src/i18n/request.ts`):
```typescript
export default getRequestConfig(async ({ locale }) => {
  return {
    messages: (await import(`../../messages/${locale}.json`)).default
    //                              ↑
    //                    Loads consolidated file
  };
});
```

### Translation Structure in Consolidated Files:
```json
{
  "brand": {...},
  "nav": {...},
  "actions": {...},
  "auth": {...},
  "dashboard": {...},
  "landing": {           ← Namespace
    "hero": {
      "badge": "...",
      "title": "...",
      "titleHighlight": "...",
      "subtitle": "...",
      "ctaPrimary": "...",
      "ctaSecondary": "..."
    },
    "social": {
      "trusted": "..."
    },
    "features": {
      "title": "...",
      "subtitle": "...",
      "instantSetup": {...},
      "securePayments": {...},
      "customDomains": {...},
      "exploreAll": "..."
    }
  }
}
```

---

## 📝 Usage in Components

```tsx
import { useTranslations } from 'next-intl';

export default function LandingPage() {
  const t = useTranslations('landing');
  //                         ↑
  //                    Namespace from consolidated file
  
  return (
    <div>
      <h1>{t('hero.badge')}</h1>
      <p>{t('hero.subtitle')}</p>
      <button>{t('hero.ctaPrimary')}</button>
    </div>
  );
}
```

---

## ⚠️ Important Notes

### 1. **Only Consolidated Files Are Used**
- The i18n system reads from `messages/en.json` and `messages/ar.json`
- Files in `messages/en/` and `messages/ar/` folders are **NOT** automatically loaded
- They exist only for organization purposes

### 2. **Adding New Translations**
To add new translations, you must update the **consolidated files**:

**Option A: Edit Directly**
```bash
# Edit the consolidated file
code messages/en.json
# Add your translations to the appropriate namespace
```

**Option B: Merge from Separate Files**
```bash
# 1. Create/edit separate file
code messages/en/myfeature.json

# 2. Merge into consolidated file
node -e "const main = require('./messages/en.json'); const feature = require('./messages/en/myfeature.json'); main.myfeature = feature; require('fs').writeFileSync('messages/en.json', JSON.stringify(main, null, 2));"
```

### 3. **Both Languages Must Match**
- Both `en.json` and `ar.json` must have the same structure
- Missing keys will cause errors
- Always update both files together

---

## ✅ Current Status

### Verified Working:
```bash
✅ EN has landing: true
✅ AR has landing: true
✅ EN landing keys: [ 'hero', 'social', 'features' ]
✅ AR landing keys: [ 'hero', 'social', 'features' ]
```

### Translation Namespaces Available:
- `brand` - Brand name, tagline
- `nav` - Navigation links
- `actions` - Common actions (save, cancel, etc.)
- `status` - Status labels
- `time` - Time-related labels
- `errors` - Error messages
- `success` - Success messages
- `loading` - Loading states
- `empty` - Empty states
- `footer` - Footer content
- `auth` - Authentication pages
- `dashboard` - Dashboard and merchant panel
- `landing` - Landing page ✅ NEW

---

## 🚀 Testing

### Test URLs:
- **English:** http://localhost:3000/en
- **Arabic:** http://localhost:3000/ar

### Expected Behavior:
- ✅ No console errors
- ✅ All text displays in correct language
- ✅ RTL layout works for Arabic
- ✅ Gradients and animations work
- ✅ All buttons and links functional

---

## 🔄 If You Need to Update Translations

### Step 1: Edit Consolidated File
```bash
# Open the file
code messages/en.json

# Find the namespace
"landing": {
  "hero": {
    "badge": "YOUR NEW TEXT HERE"
  }
}
```

### Step 2: Update Both Languages
```bash
# Update English
messages/en.json

# Update Arabic
messages/ar.json
```

### Step 3: Save and Reload
- Turbopack will auto-reload
- Changes appear immediately
- No server restart needed

---

## 📚 Reference

### File Locations:
- **Consolidated EN:** `messages/en.json`
- **Consolidated AR:** `messages/ar.json`
- **i18n Config:** `src/i18n/request.ts`
- **Routing Config:** `src/i18n/routing.ts`
- **Landing Page:** `src/app/[locale]/page.tsx`

### Documentation:
- `I18N_COMPLETE.md` - Full i18n implementation
- `LANDING_PAGE_REDESIGN.md` - Landing page design
- `TRANSLATION_TROUBLESHOOTING.md` - Troubleshooting guide

---

**Status: ✅ WORKING**

All translations are properly loaded and the landing page should now display correctly in both English and Arabic! 🚀
