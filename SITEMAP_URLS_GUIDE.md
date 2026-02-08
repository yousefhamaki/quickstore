# ✅ Sitemap URLs - Complete Guide

## Sitemap Locations

Your application now has **2 sitemap locations**:

### 1. Root Sitemap (Simple)
**URL:** `http://hamaki.quickstore.com:3000/sitemap.xml`  
**Purpose:** Main application sitemap  
**Contains:** Root URLs only

### 2. Store-Specific Sitemap (Dynamic)
**URL:** `http://hamaki.quickstore.com:3000/en/store/hamaki/sitemap.xml`  
**Purpose:** Individual store sitemap with products  
**Contains:** Store homepage, products, policies

---

## Correct URLs to Use

### For Local Development

#### Root Sitemap
```
http://localhost:3000/sitemap.xml
```

#### Store Sitemap (with locale and subdomain)
```
http://localhost:3000/en/store/hamaki/sitemap.xml
```

### For Production

#### Store on Subdomain
```
https://hamaki.buildora.app/sitemap.xml
```
OR
```
https://hamaki.buildora.app/en/store/hamaki/sitemap.xml
```

#### Store on Custom Domain
```
https://hamaki.quickstore.com/sitemap.xml
```

---

## Why You Got 404

### What You Tried ❌
```
http://hamaki.quickstore.com:3000/sitemap.xml
```

### Why It Failed
The URL `hamaki.quickstore.com:3000` is pointing to localhost via your hosts file, but:
1. You need to include the locale: `/en/`
2. You need to include the store route: `/store/hamaki/`
3. OR use the new root sitemap (after restart)

### Correct URLs ✅

**Option 1: Root Sitemap (Simple)**
```
http://hamaki.quickstore.com:3000/sitemap.xml
```
*Requires frontend restart*

**Option 2: Store Sitemap (Full)**
```
http://hamaki.quickstore.com:3000/en/store/hamaki/sitemap.xml
```
*Should work now*

---

## URL Structure Explained

### Store Route Pattern
```
/[locale]/store/[subdomain]/[page]
```

### Examples
| Page | URL |
|------|-----|
| Homepage | `/en/store/hamaki/` |
| Products | `/en/store/hamaki/products/123` |
| Sitemap | `/en/store/hamaki/sitemap.xml` |
| Robots | `/en/store/hamaki/robots.txt` |

---

## Testing Steps

### 1. Test Store Sitemap (Works Now)
```
http://hamaki.quickstore.com:3000/en/store/hamaki/sitemap.xml
```

**Expected:**
- ✅ Store homepage URL
- ✅ All product URLs
- ✅ Policy page URLs

### 2. Restart Frontend for Root Sitemap
```bash
# Stop frontend (Ctrl+C)
cd frontend
npm run dev
```

Then test:
```
http://hamaki.quickstore.com:3000/sitemap.xml
```

**Expected:**
- ✅ Simple root sitemap

---

## Which Sitemap to Use?

### For SEO (Recommended)
Use the **Store-Specific Sitemap**:
```
https://[subdomain].buildora.app/en/store/[subdomain]/sitemap.xml
```

**Why?**
- ✅ Contains all products
- ✅ Contains policy pages
- ✅ Dynamic (updates automatically)
- ✅ SEO-optimized

### For Testing
Use the **Root Sitemap**:
```
http://localhost:3000/sitemap.xml
```

**Why?**
- ✅ Simple URL
- ✅ Easy to remember
- ✅ Quick testing

---

## Production Setup

### When Store Goes Live

#### On Buildora Subdomain
```
https://hamaki.buildora.app/sitemap.xml
```

The sitemap will automatically work at the root because Next.js will serve the store-specific sitemap.

#### On Custom Domain
```
https://hamaki.quickstore.com/sitemap.xml
```

Same - automatic routing to store sitemap.

---

## Google Search Console Setup

### Submit Sitemap

1. Go to Google Search Console
2. Select your property
3. Go to "Sitemaps"
4. Add sitemap URL:

**For Subdomain:**
```
https://hamaki.buildora.app/sitemap.xml
```

**For Custom Domain:**
```
https://hamaki.quickstore.com/sitemap.xml
```

---

## Summary

| Sitemap Type | URL | Status | Use Case |
|--------------|-----|--------|----------|
| Root | `/sitemap.xml` | ✅ Created | Simple testing |
| Store (Full) | `/en/store/hamaki/sitemap.xml` | ✅ Working | Production SEO |

---

## Quick Test Commands

### Test Store Sitemap Now (No Restart)
```bash
# In browser or curl:
http://hamaki.quickstore.com:3000/en/store/hamaki/sitemap.xml
```

### Test Root Sitemap (After Restart)
```bash
# 1. Restart frontend
# 2. Then test:
http://hamaki.quickstore.com:3000/sitemap.xml
```

---

**Try this URL now (should work):**
```
http://hamaki.quickstore.com:3000/en/store/hamaki/sitemap.xml
```

This should load your store sitemap with all products! 🎉
