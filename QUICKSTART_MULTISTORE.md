# QuickStore Multi-Store - Quick Start Guide

## 🚀 **Phase 2.1 Complete - Multi-Store Architecture Ready!**

---

## ✅ **What's New**

QuickStore now supports **multiple stores per merchant** with a **draft/live publishing system**!

### **Key Features:**
- ✅ **Multi-Store Support** - Merchants can create multiple stores based on their plan
- ✅ **Draft/Live/Paused States** - Build stores privately before going live
- ✅ **Subscription at Merchant Level** - One subscription covers all stores
- ✅ **Store Limits by Plan** - Basic (1), Pro (3), Enterprise (10)
- ✅ **Preview System** - Test stores before publishing
- ✅ **Onboarding Checklist** - Track store setup progress
- ✅ **Subdomain System** - Each store gets unique subdomain

---

## 🏃 **Quick Start**

### **1. Seed Updated Plans**
```bash
cd quickstore/backend
npm run seed
```

This will create/update the subscription plans with store limits:
- **Basic Plan** (299 EGP): 1 store, 100 products
- **Pro Plan** (599 EGP): 3 stores, 1000 products
- **Enterprise Plan** (999 EGP): 10 stores, unlimited products

### **2. Start Backend**
```bash
npm run dev
```

### **3. Test the New APIs**

#### **Create a Store:**
```bash
POST http://localhost:5000/api/stores
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "name": "My Fashion Store",
  "description": "Premium clothing and accessories",
  "contact": {
    "email": "contact@example.com",
    "phone": "+20123456789"
  }
}
```

#### **Get All Stores:**
```bash
GET http://localhost:5000/api/stores
Authorization: Bearer <your_token>
```

#### **Check Onboarding Progress:**
```bash
GET http://localhost:5000/api/stores/:storeId/checklist
Authorization: Bearer <your_token>
```

#### **Publish Store:**
```bash
POST http://localhost:5000/api/stores/:storeId/publish
Authorization: Bearer <your_token>
```

---

## 📊 **Architecture Changes**

### **Before:**
```
User → Single Store (with subscription)
```

### **After:**
```
User (with subscription)
  ├── Store 1 (draft)
  ├── Store 2 (live)
  └── Store 3 (paused)
```

---

## 🎯 **Store Lifecycle**

```
CREATE (draft)
  ↓
BUILD (add products, configure settings)
  ↓
PREVIEW (test with preview token)
  ↓
PUBLISH (go live after validation)
  ↓
LIVE (customers can browse & buy)
  ↓
PAUSE (optional - temporarily disable)
```

---

## 📝 **API Endpoints**

### **Store Management:**
- `GET /api/stores` - List all stores
- `POST /api/stores` - Create new store
- `GET /api/stores/:id` - Get store details
- `PUT /api/stores/:id` - Update store
- `DELETE /api/stores/:id` - Delete store

### **Publishing:**
- `POST /api/stores/:id/publish` - Publish store
- `POST /api/stores/:id/unpublish` - Unpublish store
- `POST /api/stores/:id/pause` - Pause store
- `POST /api/stores/:id/resume` - Resume store

### **Utilities:**
- `POST /api/stores/:id/preview-token` - Generate preview token
- `GET /api/stores/check-subdomain/:subdomain` - Check availability
- `GET /api/stores/:id/checklist` - Get onboarding checklist

---

## 🔐 **Subscription Limits**

### **Store Creation:**
- Checks if merchant has active subscription
- Checks if store limit reached for current plan
- Returns error if limit exceeded

### **Product Creation:**
- Checks subscription status on User (not Store)
- Enforces product limit per store
- Returns error if limit exceeded

---

## 🎨 **Store Status System**

### **Draft:**
- Default status when created
- Not visible to public
- Can be previewed with token
- Can be edited freely

### **Live:**
- Published and visible to customers
- Accessible at subdomain
- Can receive orders
- Can be paused or unpublished

### **Paused:**
- Temporarily disabled
- Not visible to customers
- Can be resumed to live
- Useful for maintenance

---

## 📋 **Onboarding Checklist**

The system tracks store setup progress:

```json
{
  "checklist": {
    "storeInfo": { "completed": true, "label": "Store information completed" },
    "branding": { "completed": false, "label": "Logo and branding set" },
    "products": { "completed": false, "current": 2, "target": 5 },
    "payment": { "completed": true, "label": "Configure payment methods" },
    "shipping": { "completed": false, "label": "Set up shipping zones" },
    "policies": { "completed": false, "label": "Add store policies" }
  },
  "progress": {
    "completed": 2,
    "total": 6,
    "percentage": 33
  }
}
```

---

## ⚠️ **Pre-Launch Validation**

Before publishing, the system checks:
- ✅ At least 1 active product
- ✅ Payment methods configured
- ✅ Contact email or phone added

If validation fails, returns list of required actions.

---

## 🔧 **Testing Checklist**

### **Backend:**
- [ ] Seed plans with `npm run seed`
- [ ] Start backend with `npm run dev`
- [ ] Test store creation (check limit enforcement)
- [ ] Test store publishing (check validation)
- [ ] Test subdomain uniqueness
- [ ] Test onboarding checklist

### **Subscription:**
- [ ] Create user with Basic plan (1 store limit)
- [ ] Try creating 2nd store (should fail)
- [ ] Upgrade to Pro plan
- [ ] Create 2nd and 3rd store (should succeed)
- [ ] Try creating 4th store (should fail)

---

## 📚 **Documentation**

- **Full Summary:** `PHASE2.1_MULTISTORE_SUMMARY.md`
- **Phase 2 Progress:** `PHASE2_PROGRESS.md`
- **Auth Guide:** `AUTH_GUIDE.md`

---

## 🎯 **Next Steps - Phase 2.2**

### **Frontend Implementation:**

1. **All Stores Dashboard** (`/dashboard`)
   - Grid view of all stores
   - Status badges
   - Quick stats
   - Create new store button

2. **Create Store Flow** (`/dashboard/stores/new`)
   - Multi-step form
   - Subdomain availability check
   - Branding setup

3. **Single Store Dashboard** (`/dashboard/stores/[storeId]`)
   - Overview with analytics
   - Onboarding checklist
   - Quick actions

4. **Store Settings Pages**
   - General, Payments, Shipping, Policies, Domain

5. **Preview & Publish**
   - Preview mode with banner
   - Go Live flow with validation

---

## 🐛 **Troubleshooting**

### **"Store limit reached"**
- Check user's subscription plan
- Verify `maxStores` in plan
- Upgrade plan if needed

### **"Cannot publish store"**
- Check validation errors in response
- Add required products/settings
- Try again

### **"Subdomain already taken"**
- Use subdomain availability check endpoint
- System auto-generates unique subdomain
- Try different store name

---

## 💡 **Tips**

1. **Slug Generation:** Store slugs are auto-generated from names
2. **Subdomain Uniqueness:** System ensures unique subdomains
3. **Preview Tokens:** Valid for 24 hours
4. **Store Deletion:** Can't delete stores with products
5. **Subscription:** One subscription covers all stores

---

## ✅ **Status**

- **Backend:** ✅ Complete & Building Successfully
- **Models:** ✅ Updated with new architecture
- **APIs:** ✅ All endpoints functional
- **Validation:** ✅ Limits & checks in place
- **Documentation:** ✅ Comprehensive guides created

**Ready for:** Frontend implementation (Phase 2.2)

---

## 🚀 **Let's Build!**

The multi-store foundation is solid and ready. Time to build the frontend dashboard!

**Happy Coding! 🎉**
