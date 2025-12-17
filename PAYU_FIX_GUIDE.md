# 🚨 PayU Payment Integration - CRITICAL FIX REQUIRED

## Problem Identified

The PayU payment gateway is **not working** because the merchant credentials are **missing from the environment variables**.

### Error Details
- **Error Code:** `1069236_69407e8109658_69407e8109adc`
- **Error Message:** "Pardon, Some Problem Occurred"
- **Root Cause:** PayU credentials not configured in `.env` or `.env.local`

---

## 🔧 Quick Fix

### Step 1: Get Your PayU Credentials

1. Go to [PayU Merchant Dashboard](https://merchant.payu.in)
2. Login with your account
3. Navigate to **Settings → API Keys** or **Key & Salt**
4. Copy your:
   - **Merchant Key** (e.g., `XXXXX`)
   - **Merchant Salt** (e.g., `YYYYY`)

### Step 2: Add to Environment Variables

Create or update `.env.local` file in the root directory:

```dotenv
# PayU Payment Gateway Configuration
PAYU_MODE=TEST                    # Use TEST for development, PRODUCTION for live
PAYU_MERCHANT_KEY=your_merchant_key_here
PAYU_MERCHANT_SALT=your_merchant_salt_here
```

### Step 3: Restart Development Server

```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

---

## ✅ Test Credentials (for Testing)

If you want to test without real PayU account:

```dotenv
PAYU_MODE=TEST
PAYU_MERCHANT_KEY=<your_key>
PAYU_MERCHANT_SALT=<your_salt>
```

**Test Payment Card:**
- Card Number: `5123456789012346`
- Expiry: Any future date
- CVV: Any 3 digits
- Amount: Any value

---

## 🔍 Verification Checklist

After adding credentials, verify:

- [ ] `.env.local` file created in project root
- [ ] Both `PAYU_MERCHANT_KEY` and `PAYU_MERCHANT_SALT` are set
- [ ] No empty values (e.g., `PAYU_MERCHANT_KEY=` is wrong)
- [ ] Server restarted (`npm run dev`)
- [ ] No extra spaces around values

### Verify Configuration

```bash
# Check if credentials are set
grep PAYU_ .env.local

# Should output:
# PAYU_MODE=TEST
# PAYU_MERCHANT_KEY=your_key
# PAYU_MERCHANT_SALT=your_salt
```

---

## 📋 Updated .env.local Template

```dotenv
# ===== MongoDB =====
MONGODB_URI=mongodb+srv://<username>:<password>@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority

# ===== JWT Authentication =====
JWT_SECRET=your_long_random_secret_string_here_min_32_chars

# ===== PayU Payment Gateway =====
PAYU_MODE=TEST                              # TEST or PRODUCTION
PAYU_MERCHANT_KEY=your_merchant_key_here
PAYU_MERCHANT_SALT=your_merchant_salt_here

# ===== Admin Panel =====
ADMIN_PANEL_TOKEN=admin_replace_me

# ===== Optional: Public URLs =====
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 🚀 Production Deployment

When deploying to production (Vercel, etc.):

1. **Do NOT use TEST mode credentials**
2. Get **PRODUCTION/LIVE** credentials from PayU
3. Set environment variables in your hosting platform:
   - Vercel: Settings → Environment Variables
   - Docker: Pass as ENV variables
   - Traditional Server: Add to `.env` (secured)

```dotenv
PAYU_MODE=PRODUCTION
PAYU_MERCHANT_KEY=your_production_key
PAYU_MERCHANT_SALT=your_production_salt
```

---

## 🧪 Testing Payment Flow

### 1. Test Checkout Page
```
1. Go to http://localhost:3000/workshops
2. Add a workshop to cart
3. Click "Checkout"
4. Fill form with test data
5. Click "Proceed to Payment"
6. Should redirect to PayU payment page
```

### 2. Check Server Logs
```bash
# Look for PayU initiation logs
npm run dev

# Should show:
# PayU payment initiated: {
#   txnid: 'xxxxx',
#   amount: 1000,
#   email: 'test@example.com',
#   mode: 'TEST'
# }
```

### 3. Test with Test Card
- Use card: `5123456789012346`
- Any future expiry date
- Any CVV
- OTP: `123456` (test mode auto-fills)

---

## 🐛 Troubleshooting

### Issue 1: Still Getting "Some Problem Occurred"

**Solution:**
```bash
# 1. Check credentials are set
grep PAYU_ .env.local

# 2. Verify no trailing spaces
cat .env.local | od -c | grep PAYU_

# 3. Check .env.local encoding (should be UTF-8)
file .env.local

# 4. Restart server completely
# Kill any node processes
killall node
npm run dev
```

### Issue 2: "PayU credentials not configured" Error

**Solution:**
- Ensure `.env.local` exists in project root (same level as `package.json`)
- Check file name is exactly `.env.local` (not `.env.local.example`)
- Verify credentials are not empty

### Issue 3: "Hash mismatch" Error

**Solution:**
```bash
# 1. Check merchant key and salt are correct (copy-paste from PayU dashboard)
# 2. Verify PAYU_MODE matches your credentials (TEST or PRODUCTION)
# 3. Check for extra spaces or special characters in credentials
```

### Issue 4: Form Submitting But Not Going to PayU

**Solution:**
```bash
# Check browser console for JavaScript errors
# Press F12 → Console tab
# Look for network errors to /api/payments/payu/initiate

# If 500 error, check server logs:
npm run dev
# Look for error messages related to PayU
```

---

## 📞 Getting Help

### PayU Support
- **Merchant Dashboard:** https://merchant.payu.in
- **Documentation:** https://payu.in/payment-gateway
- **Support:** support@payu.in

### Local Setup Help
1. Verify credentials are correct (copy directly from PayU dashboard)
2. Check `.env.local` is in project root
3. Restart `npm run dev`
4. Clear browser cache (Ctrl+Shift+Delete)
5. Test with test credentials first

---

## ✨ Summary

| Item | Status | Action |
|------|--------|--------|
| PayU Credentials | ❌ Missing | Add to `.env.local` |
| PAYU_MODE | ❌ Not Set | Set to `TEST` or `PRODUCTION` |
| PAYU_MERCHANT_KEY | ❌ Missing | Get from PayU dashboard |
| PAYU_MERCHANT_SALT | ❌ Missing | Get from PayU dashboard |
| Server Restart | ⏳ Required | Run `npm run dev` |
| Testing | ⏳ Ready | Use test card `5123456789012346` |

---

## Next Steps

1. ✅ Get PayU credentials from https://merchant.payu.in
2. ✅ Add to `.env.local` file
3. ✅ Restart development server
4. ✅ Test payment flow with test credentials
5. ✅ Verify error is resolved

**Once done, PayU payments will work correctly! 🎉**
