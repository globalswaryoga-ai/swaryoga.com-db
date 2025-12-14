# 🔴 CRITICAL FIX: Add Environment Variables to Vercel

## Why It's Not Working on the Website

- ✅ **Localhost:** Works (uses `.env.local`)
- ❌ **Website:** Fails (Vercel doesn't have env vars)

## Step-by-Step Fix (Must Do This!)

### **Step 1: Go to Vercel Dashboard**
```
https://vercel.com/dashboard
```

### **Step 2: Select Your Project**
- Look for: `swaryoga.com-db5`
- Click on it

### **Step 3: Open Settings**
```
Click the "Settings" tab at the top
```

### **Step 4: Go to Environment Variables**
```
Left sidebar → "Environment Variables"
```

### **Step 5: Check Current Variables**
You should see a list of variables. Look for:
- ❌ MONGODB_URI (might be empty or wrong)
- ❌ JWT_SECRET (might be empty)
- ❌ NEXT_PUBLIC_API_URL (might be empty)

### **Step 6: Edit MONGODB_URI**
1. Find `MONGODB_URI` in the list
2. Click the **three dots (⋯)** on the right
3. Click **Edit**
4. Clear the field
5. Paste this exact value:
```
mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority
```
6. Make sure **Production** checkbox is selected
7. Click **Save**

### **Step 7: Edit JWT_SECRET**
1. Find `JWT_SECRET` in the list
2. Click the **three dots (⋯)** → **Edit**
3. Paste:
```
your-secret-key-change-this-in-production-minimum-32-chars
```
4. Make sure **Production** is selected
5. Click **Save**

### **Step 8: Edit NEXT_PUBLIC_API_URL**
1. Find `NEXT_PUBLIC_API_URL` in the list
2. Click the **three dots (⋯)** → **Edit**
3. Paste:
```
https://swaryoga.com
```
4. Make sure **Production** is selected
5. Click **Save**

---

## **IMPORTANT NOTES**

✅ **After you save each variable:**
- Vercel will show a message like "Environment variable updated"
- Vercel will automatically start a new deployment
- Wait 2-3 minutes for deployment to complete

✅ **Verify Deployment Completed:**
1. Go to **Deployments** tab
2. Look for latest deployment with green checkmark
3. It should say "Production" with ✓ READY

✅ **Then Test the Website:**
1. Go to: https://swaryoga.com/signin
2. Try signing in or up
3. Should work now! ✅

---

## **If You Need Help**

The three variables and their exact values:

**Variable 1: MONGODB_URI**
```
mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority
```

**Variable 2: JWT_SECRET**
```
your-secret-key-change-this-in-production-minimum-32-chars
```

**Variable 3: NEXT_PUBLIC_API_URL**
```
https://swaryoga.com
```

---

## **DO THIS NOW! ⚠️**

Without these variables, **nothing will work on the website**. 

It's a 5-minute process. Once done, everything will be live! 🚀

