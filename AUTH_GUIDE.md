# QuickStore - Login & Authentication Guide

## 🔐 Understanding the 307 Redirect

When you see a **307 Temporary Redirect** on `/auth/login`, it means:

### ✅ **This is Expected Behavior**
The middleware detects you have a token cookie and redirects you away from the login page because you're already logged in.

---

## 🚀 How to Access QuickStore

### **If You're Already Logged In:**
1. Go directly to: `http://localhost:3000/merchant`
2. You'll see the merchant dashboard
3. Use the **Logout** button in the sidebar when you want to log out

### **If You Need to Login:**
1. **First, clear your session** (if you have an old/invalid token):
   - Visit: `http://localhost:3000/auth/clear`
   - This will clear cookies and redirect you to login
   
2. **Or manually clear cookies**:
   - Open DevTools (F12)
   - Go to Application → Cookies
   - Delete the `token` cookie
   - Refresh the page

3. **Then login**:
   - Go to: `http://localhost:3000/auth/login`
   - Enter your credentials
   - You'll be redirected to `/merchant` dashboard

---

## 🔑 Test Credentials

### **Create a Test Account:**
```bash
# Option 1: Register via UI
http://localhost:3000/auth/register

# Option 2: Use Postman/curl
POST http://localhost:5000/api/auth/register
Body: {
  "name": "Test Merchant",
  "email": "merchant@test.com",
  "password": "password123"
}
```

### **Login:**
```bash
POST http://localhost:5000/api/auth/login
Body: {
  "email": "merchant@test.com",
  "password": "password123"
}
```

---

## 🛠️ Troubleshooting

### **Problem: Can't access login page (307 redirect)**
**Solution:**
- You're already logged in
- Either go to `/merchant` or logout first
- Or visit `/auth/clear` to clear your session

### **Problem: Logged in but can't access merchant pages**
**Solution:**
- Your token might be invalid/expired
- Visit `/auth/clear` to clear session
- Login again

### **Problem: Login successful but redirected to wrong page**
**Solution:**
- Check your user role in the response
- Merchants go to `/merchant`
- Admins go to `/admin`

---

## 📍 Important URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:3000/` | Home page |
| `http://localhost:3000/auth/login` | Login page |
| `http://localhost:3000/auth/register` | Registration page |
| `http://localhost:3000/auth/clear` | Clear session (logout utility) |
| `http://localhost:3000/merchant` | Merchant dashboard |
| `http://localhost:3000/merchant/products` | Product management |
| `http://localhost:3000/merchant/orders` | Order management |
| `http://localhost:3000/admin` | Admin dashboard |

---

## 🔄 Middleware Logic

The middleware (`src/middleware.ts`) works as follows:

```typescript
1. If accessing /merchant or /admin routes:
   - Check if token exists
   - If NO token → Redirect to /auth/login
   - If token exists → Allow access

2. If accessing /auth/login or /auth/register:
   - Check if token exists
   - If token exists → Redirect to / (home)
   - If NO token → Allow access to login/register
```

This prevents:
- ❌ Accessing protected routes without login
- ❌ Accessing login page when already logged in

---

## 🎯 Quick Start Flow

### **First Time Setup:**
1. Start backend: `cd quickstore/backend && npm run dev`
2. Start frontend: `cd quickstore/frontend && npm run dev`
3. Register: `http://localhost:3000/auth/register`
4. Login automatically redirects to `/merchant`
5. Start managing products!

### **Returning User:**
1. Go to: `http://localhost:3000/merchant`
2. If not logged in, you'll be redirected to login
3. Login and continue

### **Need to Logout:**
1. Click **Logout** button in sidebar
2. Or visit: `http://localhost:3000/auth/clear`

---

## 🐛 Common Issues

### **Issue: "Failed to load dashboard data"**
- Backend might not be running
- Check: `http://localhost:5000/`
- Should see: "QuickStore API is running..."

### **Issue: "Network Error" on login**
- Backend not running or wrong port
- Check backend is on port 5000
- Check frontend API config in `src/services/api.ts`

### **Issue: Infinite redirect loop**
- Clear browser cache and cookies
- Visit `/auth/clear`
- Try incognito mode

---

## 📝 Developer Notes

### **Token Storage:**
- Token stored in **cookies** (7-day expiry)
- User data stored in **localStorage**
- Both cleared on logout

### **Authentication Flow:**
1. User submits login form
2. Frontend calls `POST /api/auth/login`
3. Backend validates credentials
4. Backend returns JWT token + user data
5. Frontend stores token in cookie
6. Frontend stores user in localStorage
7. Frontend redirects based on role

### **Protected Routes:**
- All `/merchant/*` routes require authentication
- All `/admin/*` routes require authentication
- Middleware checks token before allowing access

---

## ✅ New Features Added

### **Logout Button:**
- ✅ Added to merchant sidebar
- ✅ Confirmation dialog before logout
- ✅ Clears cookies and localStorage
- ✅ Redirects to login page

### **Clear Session Utility:**
- ✅ New page at `/auth/clear`
- ✅ Automatically clears all auth data
- ✅ Redirects to login
- ✅ Useful for debugging

---

## 🎨 UI Improvements

The logout button in the sidebar:
- Red background (hover effect)
- Confirmation dialog
- Smooth transition
- Positioned below user profile card

---

**Need Help?** 
- Check if backend is running: `http://localhost:5000/`
- Check browser console for errors (F12)
- Clear session: `http://localhost:3000/auth/clear`
- Restart both servers if issues persist
