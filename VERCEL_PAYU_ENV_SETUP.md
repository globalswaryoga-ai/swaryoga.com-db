# 🚀 VERCEL PayU ENVIRONMENT VARIABLES SETUP

**Status:** 🔴 MISSING - This is why payments are failing!

---

## 📋 WHAT'S MISSING

Your Vercel deployment does NOT have PayU environment variables:

```
❌ PAYU_MERCHANT_KEY         (NOT SET)
❌ PAYU_MERCHANT_SALT        (NOT SET)
❌ PAYU_MODE                 (NOT SET - defaults to TEST, causes issues)
```

Without these, payments fail with 404 error.

---

## 🔑 WHAT YOU NEED

### **Test Mode (For Development):**
```
PAYU_MERCHANT_KEY = test_key_12345
PAYU_MERCHANT_SALT = test_salt_67890
PAYU_MODE = TEST
```

### **Production Mode (Real Payments):**
```
PAYU_MERCHANT_KEY = your_actual_key
PAYU_MERCHANT_SALT = your_actual_salt
PAYU_MODE = PRODUCTION
```

**Get these from:** https://www.payu.in/ → Merchant Dashboard

---

## 📱 STEP-BY-STEP: ADD TO VERCEL

### **Step 1: Go to Vercel Dashboard**
```
1. Open: https://vercel.com/dashboard
2. Find: "swar-yoga-web-mohan" project
3. Click it to open
```

### **Step 2: Go to Settings**
```
1. Click "Settings" tab (top)
2. Click "Environment Variables" (left menu)
```

### **Step 3: Add PayU Credentials**

**Add First Variable:**
```
Name:    PAYU_MERCHANT_KEY
Value:   (your key from PayU dashboard)
Environments: ✓ Production ✓ Preview ✓ Development
Click: Add
```

**Add Second Variable:**
```
Name:    PAYU_MERCHANT_SALT
Value:   (your salt from PayU dashboard)
Environments: ✓ Production ✓ Preview ✓ Development
Click: Add
```

**Add Third Variable:**
```
Name:    PAYU_MODE
Value:   TEST  (or PRODUCTION)
Environments: ✓ Production ✓ Preview ✓ Development
Click: Add
```

### **Step 4: Redeploy**
```
1. Go to "Deployments" tab
2. Click "..." on latest deployment
3. Click "Redeploy"
4. Wait for build to complete
```

### **Step 5: Test**
```
1. Go to https://swaryoga.com/checkout
2. Try payment
3. Should redirect to PayU payment page
4. Should NOT show 404 error
```

---

## 🎯 HOW TO GET CREDENTIALS

### **Option 1: Test Mode (Recommended for now)**
```
You can use test credentials immediately:

PAYU_MERCHANT_KEY = test_key
PAYU_MERCHANT_SALT = test_salt
PAYU_MODE = TEST
```

### **Option 2: Production Mode (Real Money)**
```
1. Go to: https://www.payu.in/
2. Create account or login
3. Go to: Settings → API Keys
4. Copy: Merchant Key
5. Copy: Merchant Salt
6. Set: PAYU_MODE = PRODUCTION
```

---

## ⚠️ WHY PAYMENTS ARE FAILING NOW

```
Current Flow (BROKEN):
┌─────────────────────┐
│ Click "Pay"         │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Call /api/payments/ │
│ initiate            │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Check PAYU_MERCHANT │
│ _KEY & SALT         │
└──────────┬──────────┘
           ↓
    ❌ NOT FOUND
           ↓
┌─────────────────────┐
│ Return Error:       │
│ "Credentials not    │
│  configured"        │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Frontend shows 404  │
│ or payment error    │
└─────────────────────┘
```

---

## ✅ AFTER YOU ADD ENV VARS

```
Fixed Flow (WORKING):
┌─────────────────────┐
│ Click "Pay"         │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Call /api/payments/ │
│ initiate            │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Check PAYU_MERCHANT │
│ _KEY & SALT         │
└──────────┬──────────┘
           ↓
    ✅ FOUND!
           ↓
┌─────────────────────┐
│ Generate PayU hash  │
│ Return payment URL  │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Redirect to PayU    │
│ test.payu.in        │
│ (or secure.payu.in) │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ User enters payment │
│ details & pays      │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ PayU processes      │
│ payment             │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Redirect to success │
│ or failure page     │
└─────────────────────┘
```

---

## 📸 VERCEL SETUP SCREENSHOT GUIDE

### **What you'll see:**

```
Vercel Settings → Environment Variables

┌─────────────────────────────────────────────┐
│ Environment Variables                       │
├─────────────────────────────────────────────┤
│                                             │
│ PAYU_MERCHANT_KEY                           │
│ Value: ●●●●●●●●●●●●●●●●●●●● (hidden)      │
│ Production Preview Development  [Edit][X]   │
│                                             │
│ PAYU_MERCHANT_SALT                          │
│ Value: ●●●●●●●●●●●●●●●●●●●● (hidden)      │
│ Production Preview Development  [Edit][X]   │
│                                             │
│ PAYU_MODE                                   │
│ Value: TEST                                 │
│ Production Preview Development  [Edit][X]   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔐 SECURITY NOTES

✅ **Safe:** Vercel stores env vars securely (encrypted)
✅ **Masked:** Values hidden in dashboard (shows ••••••)
✅ **Protected:** Only used by backend, never sent to frontend
✅ **Isolated:** Each environment (prod/preview) separate

---

## ✅ CHECKLIST

- [ ] Go to Vercel dashboard
- [ ] Open "swar-yoga-web-mohan" project
- [ ] Click Settings → Environment Variables
- [ ] Add PAYU_MERCHANT_KEY
- [ ] Add PAYU_MERCHANT_SALT
- [ ] Add PAYU_MODE = TEST (or PRODUCTION)
- [ ] Click Redeploy
- [ ] Wait for build complete
- [ ] Test payment at /checkout
- [ ] See payment page (not 404)

---

## 🆘 STILL NOT WORKING?

If payments still fail after adding env vars:

1. **Check Vercel logs:**
   - Go to Deployments tab
   - Click latest deployment
   - Look for errors in logs

2. **Check browser console:**
   - Open DevTools (F12)
   - Go to Console
   - Look for error messages

3. **Check network tab:**
   - Network tab in DevTools
   - Look at /api/payments/initiate request
   - Check response body for error

4. **Contact PayU support:**
   - Website: https://www.payu.in/
   - Check credentials are correct
   - Verify merchant account active

---

## 📞 WHAT TO DO NOW

**Option A: Quick Test (Recommended)**
```
1. Add test credentials to Vercel
2. Redeploy
3. Test payment flow
4. Verify working
```

**Option B: Full Production Setup**
```
1. Get real PayU credentials from PayU
2. Add to Vercel
3. Set PAYU_MODE = PRODUCTION
4. Redeploy
5. Test with real payment
```

**Option C: Pause Payments**
```
For now, you can:
- Hide checkout page
- Show payment details manually
- Collect payments separately
- Set up PayU integration later
```

---

## 🎉 EXPECTED RESULT

After adding env vars and redeploying:

```
Before:
  User clicks "Pay"
  → 404 Error (Oops, Page Not Found!)

After:
  User clicks "Pay"  
  → Redirects to PayU payment page
  → User enters card details
  → Payment processed
  → Success/failure page
```

---

**Status:** ⏳ **ACTION NEEDED FROM YOU**

Add PayU credentials to Vercel, then message me to verify! ✅
