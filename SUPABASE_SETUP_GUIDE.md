# 🔐 Supabase Configuration Guide

## Overview
Supabase is added as a **Firebase alternative** for your frontend API needs. You can use it for:
- Authentication (Sign up, Sign in, Logout)
- Real-time database (Real-time updates)
- Storage (File uploads - images, documents)
- Edge Functions (Serverless functions)

## Current Status

✅ **Dummy keys added to `.env`** - Ready to be replaced with real keys
✅ **Environment variables configured** - For frontend (VITE prefix)
✅ **Service role key added** - For backend operations (server-side only)

---

## How to Get Real Supabase Keys

### Step 1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Sign up with email or GitHub
3. Click **"New Project"**
4. Fill in:
   - Project Name: `swar-yoga-production`
   - Database Password: (save this securely)
   - Region: Choose closest to your users
5. Click **"Create new project"** and wait ~2 minutes

### Step 2: Get Your API Keys
1. Once project is created, go to **Settings** (bottom left)
2. Click **API** (in the left sidebar)
3. You'll see:
   - **Project URL** → Copy this
   - **anon public** → Copy this (for frontend)
   - **service_role secret** → Copy this (for backend only)

### Step 3: Update `.env` File

Replace the dummy values with your real keys:

```env
# Before (Dummy):
VITE_SUPABASE_URL=https://dummy-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# After (Real - Example):
VITE_SUPABASE_URL=https://myproject12345.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cHJvamVjdCIsInJvbGUiOiJhbm9uIn0...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cHJvamVjdCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUifQ...
```

### Step 4: Update Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click your project **swar-yoga-latest**
3. Go to **Settings** → **Environment Variables**
4. Add/Update:
   ```
   VITE_SUPABASE_URL = https://myproject12345.supabase.co
   VITE_SUPABASE_ANON_KEY = (your anon key)
   SUPABASE_SERVICE_ROLE_KEY = (your service role key)
   ```
5. Click **Save**
6. Vercel will auto-redeploy

---

## Environment Variables Explained

| Variable | Purpose | Visibility | Where to Use |
|----------|---------|-----------|--------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Public | Frontend (Vite) |
| `VITE_SUPABASE_ANON_KEY` | Public API key | Public | Frontend (safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret backend key | Secret | Backend only (.env) |

**Note:** `VITE_` prefix = Accessible in frontend (safe to commit)  
**No VITE_ prefix** = Backend only (DO NOT commit, keep in .env)

---

## Quick Start - Using Supabase in Frontend

### Example: Sign Up User
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
});
```

### Example: Sign In User
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});
```

### Example: Read Data from Database
```javascript
const { data, error } = await supabase
  .from('visions')
  .select('*')
  .eq('userId', 'user-id-here');
```

### Example: Insert Data
```javascript
const { data, error } = await supabase
  .from('visions')
  .insert([
    { userId: 'user-id', title: 'My Vision', description: 'Details...' }
  ]);
```

---

## File Structure for Supabase

After setup, create a helper file:

**File:** `src/utils/supabaseClient.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Then import in components:
```typescript
import { supabase } from '@/utils/supabaseClient';

// Use in your components
const { data } = await supabase.from('visions').select('*');
```

---

## Current Environment Setup

### Local Development (.env)
```env
VITE_SUPABASE_URL=https://dummy-project.supabase.co
VITE_SUPABASE_ANON_KEY=dummy_anon_key_replace_me
SUPABASE_SERVICE_ROLE_KEY=dummy_service_role_key_replace_me
```

### Vercel Production
Will use Vercel's Environment Variables (set after Step 4 above)

---

## Security Best Practices

✅ **DO:**
- Use `VITE_SUPABASE_ANON_KEY` in frontend
- Keep `SUPABASE_SERVICE_ROLE_KEY` in backend `.env` only
- Rotate keys periodically
- Enable RLS (Row Level Security) in Supabase

❌ **DON'T:**
- Commit real keys to GitHub
- Expose service role key in frontend
- Share keys publicly
- Use dummy keys in production

---

## Troubleshooting

**Q: Getting "Invalid API key" error?**
A: Check that `VITE_SUPABASE_ANON_KEY` is correct and doesn't have typos

**Q: Keys work locally but not on Vercel?**
A: Ensure environment variables are set in Vercel dashboard AND redeploy

**Q: How to rotate keys?**
A: Go to Supabase Settings → API → Regenerate keys (old keys become invalid)

---

## Next Steps

1. ✅ Dummy keys added to `.env`
2. ⏳ Create Supabase project (https://supabase.com)
3. ⏳ Get real API keys
4. ⏳ Update `.env` with real keys
5. ⏳ Update Vercel environment variables
6. ⏳ Install Supabase in frontend: `npm install @supabase/supabase-js`
7. ⏳ Create `src/utils/supabaseClient.ts`
8. ⏳ Use Supabase in your components

---

## Resources

- **Supabase Docs:** https://supabase.com/docs
- **Auth Guide:** https://supabase.com/docs/guides/auth/auth-email
- **Database Guide:** https://supabase.com/docs/guides/database
- **Real-time Guide:** https://supabase.com/docs/guides/realtime

---

**Status:** ✅ Ready to integrate  
**Dummy Keys:** ✅ Added  
**Next Action:** Create Supabase project and get real keys  
**Last Updated:** December 10, 2025
