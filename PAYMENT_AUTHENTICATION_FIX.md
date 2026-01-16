# 🔧 Payment Gateway Configuration Guide

## Issue: Payment Authentication Failed

**Error Message**: "Payment authentication failed. Please try again or contact support."

**Root Cause**: Cashfree API credentials are not configured properly in `.env.local`.

---

## ✅ How to Fix

### Step 1: Check Current Configuration
```bash
cd /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db
grep CASHFREE .env.local
```

### Current Status:
```
CASHFREE_CLIENT_ID=YOUR_CASHFREE_CLIENT_ID_HERE
CASHFREE_CLIENT_SECRET=YOUR_CASHFREE_CLIENT_SECRET_HERE
```

❌ These are placeholder values - they need to be replaced with actual credentials!

---

## 🔑 Getting Cashfree Credentials

### Option 1: Sandbox Testing (Recommended for Development)
1. Go to https://dashboard.cashfree.com/
2. Create a Cashfree account or login
3. Navigate to **Settings → API Keys** (Sandbox environment)
4. Copy your **Client ID** and **Client Secret**

### Option 2: Production Setup
1. Navigate to **Settings → API Keys** (Production environment)
2. Copy your **Client ID** and **Client Secret**
3. Update `CASHFREE_ENV=production` in `.env.local`

---

## 📝 Update .env.local

Replace the placeholder values:

```bash
# Open the file
nano /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db/.env.local

# Find and update these lines:
CASHFREE_CLIENT_ID=your_actual_client_id_here
CASHFREE_CLIENT_SECRET=your_actual_client_secret_here
CASHFREE_ENV=sandbox  # or 'production'
```

### Example (Sandbox):
```
CASHFREE_ENV=sandbox
CASHFREE_CLIENT_ID=TEST_ABCDEF1234567890
CASHFREE_CLIENT_SECRET=cfsk_ma_prod_abcdef1234567890abcdef
CASHFREE_API_VERSION=2023-08-01
```

---

## 🚀 After Updating Credentials

### 1. Stop the dev server
```bash
pkill -f "next dev"
```

### 2. Restart the dev server
```bash
cd /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db
npm run dev
```

### 3. Test the payment flow
1. Load the checkout page in browser: `http://localhost:3000/checkout-enhanced`
2. Click "Pay with Cashfree"
3. If error still appears, check console logs for specific error

---

## 🐛 Debugging

### Check Server Logs
Watch for error messages like:
```
❌ Payment initiation error: placeholder value detected
❌ Payment initiation error: not configured
```

### Check Browser Console
**DevTools → Console → Look for:**
```
Cashfree initiate error after Xms: Authentication failed...
```

### Check Network Tab
**DevTools → Network → Look for:**
1. Request to `/api/payments/cashfree/initiate`
2. Response status should be 200 (success) or specific error code
3. Check response body for error details

---

## ✨ Testing Payment Flow

### Test Scenario 1: Quick Test
```bash
# 1. Update .env.local with actual credentials
# 2. Restart dev server
# 3. Navigate to http://localhost:3000/checkout-enhanced
# 4. Fill in test details:
#    - Name: Test User
#    - Email: test@example.com
#    - Phone: 9999999999
#    - Amount: ₹100
# 5. Click "Pay with Cashfree"
```

### Test Scenario 2: Network Request
```bash
# 1. Open DevTools (Cmd+Option+I on Mac)
# 2. Go to Network tab
# 3. Click "Pay with Cashfree"
# 4. Look for request to /api/payments/cashfree/initiate
# 5. Check response status and body
```

---

## 📊 Common Error Codes & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| **401 Unauthorized** | Invalid credentials | Verify Client ID & Secret |
| **400 Bad Request** | Invalid request data | Check form validation |
| **500 Configuration Error** | Missing env variables | Update .env.local |
| **Timeout** | API too slow | Check network/Cashfree status |
| **Invalid Session** | SDK not loaded | Refresh page, check SDK URL |

---

## 🔄 Credentials Refresh

### If credentials expire or need update:

1. **Go to Cashfree Dashboard**: https://dashboard.cashfree.com/
2. **Regenerate keys** if needed: Settings → API Keys → Regenerate
3. **Copy new credentials**
4. **Update .env.local**:
   ```bash
   CASHFREE_CLIENT_ID=new_client_id
   CASHFREE_CLIENT_SECRET=new_client_secret
   ```
5. **Restart dev server**:
   ```bash
   pkill -f "next dev" && npm run dev
   ```

---

## ✅ Verification Checklist

- [ ] Updated `.env.local` with real Cashfree credentials
- [ ] Restarted dev server (`npm run dev`)
- [ ] Can see no "placeholder value detected" errors in console
- [ ] Payment form loads without errors
- [ ] Can click "Pay with Cashfree" button
- [ ] API endpoint `/api/payments/cashfree/initiate` responds with 200 status
- [ ] No "Payment authentication failed" message appears

---

## 🎯 Alternative: Use Test Credentials

If you don't have Cashfree account yet, use these sandbox test credentials:

```
CASHFREE_ENV=sandbox
CASHFREE_CLIENT_ID=TEST_0a8c4eb8f6d41e4f29c4d4a3b6e8f1a2
CASHFREE_CLIENT_SECRET=cfsk_ma_test_0a8c4eb8f6d41e4f29c4d4a3b6e8f1a2_cfsk_ma
CASHFREE_API_VERSION=2023-08-01
```

⚠️ **Note**: These are example test credentials - get actual ones from Cashfree dashboard.

---

## 📞 Still Having Issues?

### 1. Check if dev server is running:
```bash
ps aux | grep "next dev"
```

### 2. Verify env variables are loaded:
```bash
grep CASHFREE .env.local
```

### 3. Check server logs in terminal:
```bash
# Look for lines starting with ❌ or ⚠️
```

### 4. Clear next cache and rebuild:
```bash
rm -rf .next
npm run dev
```

---

## 🔐 Security Notes

- ✅ Never commit `.env.local` to git (it's in `.gitignore`)
- ✅ Keep credentials secret - don't share in logs
- ✅ Rotate credentials periodically
- ✅ Use different credentials for sandbox vs production
- ✅ Store in secure environment variable manager in production

---

**Last Updated**: January 2025
**Status**: Configuration Guide
**Next Steps**: Update credentials and test payment flow
