# Environment Variables Setup for Vercel Deployment

Your app is deployed but authentication is failing because environment variables are not configured in Vercel.

## ⚠️ Critical: Add These Environment Variables to Vercel

1. **Go to Vercel Dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Select your project: `swaryoga.com-db5`
   - Click **Settings**
   - Go to **Environment Variables**

2. **Add These Variables:**

| Variable | Value | Source |
|----------|-------|--------|
| `MONGODB_URI` | `mongodb+srv://swarsakshi9_db_user:bVq0Td7FkFty0yne@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority` | From `.env.local` |
| `JWT_SECRET` | `your-secret-key-change-this-in-production-minimum-32-chars` | From `.env.local` (⚠️ Change this!) |
| `NEXT_PUBLIC_API_URL` | `https://swaryoga.com` | Your production domain |
| `PAYU_MODE` | `TEST` or `PRODUCTION` | Based on your setup |
| `PAYU_MERCHANT_KEY` | (from PayU) | Get from https://merchant.payu.in |
| `PAYU_MERCHANT_SALT` | (from PayU) | Get from https://merchant.payu.in |

## 📋 Setup Steps

### Step 1: Configure MongoDB
1. Copy the `MONGODB_URI` from your `.env.local`
2. In Vercel: Add environment variable `MONGODB_URI`
3. Paste the connection string
4. Select "Production" environment
5. Click **Add**

### Step 2: Configure JWT Secret
1. Create a secure random string (32+ characters)
2. In Vercel: Add environment variable `JWT_SECRET`
3. Paste your secret
4. Select "Production" environment
5. Click **Add**

### Step 3: Configure API URL
1. In Vercel: Add environment variable `NEXT_PUBLIC_API_URL`
2. Set value to your production domain: `https://swaryoga.com`
3. Select "Production" environment
4. Click **Add**

### Step 4: Configure PayU (Optional but needed for payments)
1. Add `PAYU_MODE`, `PAYU_MERCHANT_KEY`, `PAYU_MERCHANT_SALT`
2. Get values from https://merchant.payu.in
3. Add each to Vercel environment variables

## 🔄 After Adding Variables

1. Vercel will automatically redeploy your app
2. Wait 2-3 minutes for deployment to complete
3. Test sign-in/sign-up at your live domain
4. If still failing, check: https://yoursite.com/api/debug/env-check

## ✅ Verification

After deployment, test these endpoints:
- `/api/debug/env-check` - Check if variables are loaded
- `/api/auth/login` - Try login
- `/api/auth/signup` - Try signup

## 🚨 Common Issues

**Issue: "Invalid email or password" even with correct credentials**
- Check `MONGODB_URI` is correct
- Verify database is accessible from Vercel IP
- Check JWT_SECRET matches between environments

**Issue: "Database connection failed (503)"**
- MONGODB_URI not set in Vercel
- MongoDB cluster IP whitelist missing `0.0.0.0/0`
- Database connection string is malformed

**Issue: Errors after deploying**
- New environment variables require full redeploy
- Check Vercel Deployments tab for build logs
- Look for "Environment Variables" section in build output

