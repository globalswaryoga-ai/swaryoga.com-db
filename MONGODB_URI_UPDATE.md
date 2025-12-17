# MongoDB URI Update for Vercel - QUICK SETUP

## ✅ Your Corrected MongoDB URI:
```
mongodb+srv://<username>:<password>@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority
```

## 📝 Step-by-Step Update in Vercel Dashboard:

1. **Go to Vercel Dashboard**
   - URL: https://vercel.com/dashboard

2. **Select Your Project**
   - Click: `swaryoga.com-db5`

3. **Go to Settings**
   - Click: **Settings** tab at top

4. **Click Environment Variables**
   - Left sidebar → **Environment Variables**

5. **Find MONGODB_URI Variable**
   - Look for existing `MONGODB_URI` in the list
   - Click the **three dots (⋯)** menu on the right
   - Select **Edit**

6. **Update the Value**
   - Clear old value
   - Paste new value:
   ```
   mongodb+srv://<username>:<password>@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority
   ```
   - Make sure **Production** is selected
   - Click **Save**

7. **Verify Other Variables**
   Also check/update these while you're there:
   - `JWT_SECRET` = `your-secret-key-change-this-in-production-minimum-32-chars`
   - `NEXT_PUBLIC_API_URL` = `https://swaryoga.com`

8. **Auto-Redeploy**
   - Vercel will automatically redeploy your app
   - Wait 2-3 minutes for deployment to complete

9. **Test the Site**
   - Go to: https://swaryoga.com
   - Try sign-up and sign-in
   - Should work now! ✅

---

## 🔍 If You Still See Errors:

Visit: `https://swaryoga.com/api/debug/env-check`

This endpoint will show you what environment variables are loaded in production.

---

## ✨ Local Testing Already Verified:

We already confirmed that:
- ✅ MongoDB connection works locally
- ✅ Sign-up works (returns 201)
- ✅ Sign-in works (returns token)
- ✅ User data persists in database

Once you update Vercel, production will work exactly the same way!

