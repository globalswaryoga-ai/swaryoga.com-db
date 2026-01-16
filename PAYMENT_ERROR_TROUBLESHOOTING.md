# 🔧 Troubleshooting: "Authentication Failed" Payment Error

## Error Message
```
❌ Payment Error
authentication Failed
```

---

## Quick Diagnosis

### Step 1: Run Diagnostic Check
Visit this URL in your browser (only works on production):
```
https://swaryoga.com/api/debug/cashfree-check
```

You'll see a JSON response like:
```json
{
  "status": "ok",
  "credentials": {
    "hasClientId": true,
    "hasClientSecret": true,
    "clientIdPrefix": "7939212d..."
  },
  "environment": {
    "CASHFREE_ENV": "production",
    "baseUrl": "https://api.cashfree.com/pg"
  },
  "testResult": {
    "statusCode": 401,
    "success": false,
    "message": "authentication Failed",
    "details": { ... }
  },
  "advice": "Authentication failed. Check if credentials are correct and not expired."
}
```

---

## Root Causes & Solutions

### ❌ Problem 1: Missing Credentials
**Symptoms:**
```json
{
  "hasClientId": false,
  "hasClientSecret": false,
  "advice": "Missing Cashfree credentials. Set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in .env"
}
```

**Solution:**
1. Go to [Cashfree Dashboard](https://dashboard.cashfree.com)
2. Get `App ID` (this is your `CASHFREE_CLIENT_ID`)
3. Get `Secret Key` (this is your `CASHFREE_CLIENT_SECRET`)
4. Add to **Vercel Environment Variables**:
   - Go to Vercel Project Settings → Environment Variables
   - Add `CASHFREE_CLIENT_ID` = Your App ID
   - Add `CASHFREE_CLIENT_SECRET` = Your Secret Key
5. Deploy again

---

### ❌ Problem 2: Invalid/Expired Credentials
**Symptoms:**
```json
{
  "testResult": {
    "statusCode": 401,
    "success": false,
    "message": "authentication Failed"
  },
  "advice": "Authentication failed. Check if credentials are correct and not expired."
}
```

**Solution:**
1. **Check credential format**: Ensure you copied the ENTIRE key without extra spaces
2. **Regenerate credentials**:
   - Go to [Cashfree Dashboard](https://dashboard.cashfree.com)
   - Go to Settings → API Keys
   - Click "Generate New Key"
   - Copy the new credentials
   - Update in Vercel Environment Variables
3. **Wait for propagation** (5-10 minutes)
4. Clear browser cache and retry

---

### ❌ Problem 3: Environment Mismatch
**Symptoms:**
- Credentials work in TEST environment but not PRODUCTION
- Or vice versa

**Solution:**
Check the environment setting in diagnostic output:
```json
{
  "environment": {
    "CASHFREE_ENV": "production"  // ← Check this
  }
}
```

**Fix:**
1. Make sure your Cashfree account is **activated for production**
2. If using TEST credentials, set `CASHFREE_ENV=sandbox` in Vercel
3. If using PRODUCTION credentials, ensure `CASHFREE_ENV=production`

---

### ❌ Problem 4: Environment Variables Not Updated
**Symptoms:**
- Diagnostic check shows missing/wrong credentials
- But you added them to Vercel

**Solution:**
1. **Trigger redeploy** in Vercel:
   - Go to Deployments
   - Click "Redeploy" on latest deployment
2. **Or push code change** to GitHub:
   ```bash
   git commit --allow-empty -m "Trigger redeploy"
   git push origin main
   ```

---

## Step-by-Step Fix

### For Vercel Deployment (Production)

```bash
# 1. Check Vercel Dashboard
#    Settings → Environment Variables
#    Verify these exist:
#    - CASHFREE_CLIENT_ID
#    - CASHFREE_CLIENT_SECRET
#    - CASHFREE_ENV=production

# 2. If missing, add them:
#    - Visit Cashfree Dashboard
#    - Copy App ID and Secret Key
#    - Add to Vercel

# 3. Redeploy to apply changes
#    - Go to Vercel → Deployments
#    - Click Redeploy button

# 4. Test in browser
#    - Go to /api/debug/cashfree-check
#    - Verify testResult.success = true
#    - Try payment again
```

### For Local Development

```bash
# 1. Check .env.local has Cashfree credentials:
cat .env.local | grep CASHFREE

# 2. Should see:
# CASHFREE_ENV=production
# CASHFREE_CLIENT_ID=...
# CASHFREE_CLIENT_SECRET=...

# 3. If missing, add them

# 4. Restart dev server:
npm run dev

# 5. Test in browser:
# http://localhost:3000/api/debug/cashfree-check
```

---

## Error Responses

### ✅ Successful Credential Check
```json
{
  "status": "ok",
  "testResult": {
    "statusCode": 400,
    "success": false,
    "message": "Invalid order data"  // This is OK - means auth passed but test order data was invalid
  },
  "advice": "Credentials appear valid. Payment should work."
}
```

### ⚠️ Authentication Failed (401/403)
```json
{
  "testResult": {
    "statusCode": 401,
    "success": false,
    "message": "authentication Failed"
  }
}
```
**Action**: Check credential validity

### ⚠️ Missing Credentials
```json
{
  "credentials": {
    "hasClientId": false,
    "hasClientSecret": false
  }
}
```
**Action**: Add to environment variables

---

## Contact Support

If issue persists after checking all above:

1. **Note these details**:
   - Output of `/api/debug/cashfree-check`
   - Exact error message from payment button
   - Cashfree environment (sandbox vs production)

2. **Check Cashfree Status**:
   - Visit [Cashfree Status Page](https://status.cashfree.com)
   - Ensure no ongoing incidents

3. **Contact Cashfree**:
   - Email: support@cashfree.com
   - Ask about:
     - Are my credentials valid?
     - Is my account production-enabled?
     - Are there any authentication issues?

---

## Common Questions

**Q: Where do I find my Cashfree credentials?**
A: [Cashfree Dashboard](https://dashboard.cashfree.com) → Settings → API Keys

**Q: How long until environment variables take effect?**
A: Usually immediately, but redeploy if needed (takes 1-2 minutes)

**Q: Can I test with sandbox credentials?**
A: Yes! Set `CASHFREE_ENV=sandbox` and use sandbox credentials

**Q: How do I know if payment succeeded?**
A: After successful payment, you'll see `/payment-success` page and lead will be created in CRM

---

## Deployment Status
✅ Commit `274484c` deployed with diagnostic endpoint
✅ Better error messages in payment button
✅ Diagnostic endpoint available at `/api/debug/cashfree-check`
