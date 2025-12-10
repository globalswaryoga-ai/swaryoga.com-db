# 🚀 Swar Yoga - Setup & Customization Guide

## ✅ What's Just Been Created

### Enhanced Authentication Pages
1. **Sign Up Page** (`/signup`)
   - Full name, email, password with confirmation
   - Phone number with country code selector
   - Country and state selection
   - Gender, age, and profession fields
   - Terms and conditions checkbox
   - Form validation with error messages
   - Success/error status messages
   - Redirect support (for cart, checkout, account)

2. **Sign In Page** (`/signin`)
   - Email and password fields
   - Show/hide password toggle
   - Remember me checkbox
   - Forgot password link
   - Form validation
   - Redirect support
   - Success/error messages

## 📋 Quick Setup (Next 5 Minutes)

### Step 1: Install Dependencies
```bash
cd /Users/mohankalburgi/Downloads/swar-yoga-web-mohan
npm install
```

### Step 2: Create Environment File
Create `.env.local` in the root directory:
```bash
cp .env.example .env.local
```

Then edit `.env.local` and add:
```
# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/swar_yoga_db

# Supabase (optional)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Security
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long

# API
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Step 3: Start Development Server
```bash
npm run dev
```

Visit: `http://localhost:3000`

## 🎯 Testing the Pages

### Test URLs:
- Home: `http://localhost:3000`
- About: `http://localhost:3000/about`
- Contact: `http://localhost:3000/contact`
- Sign Up: `http://localhost:3000/signup`
- Sign In: `http://localhost:3000/signin`
- Cart: `http://localhost:3000/cart`
- Checkout: `http://localhost:3000/checkout`
- Thank You: `http://localhost:3000/thankyou`

### Test with Redirects:
- Sign up for cart: `/signup?redirect=cart`
- Sign in for checkout: `/signin?redirect=checkout`

## 🔧 Customization Guide

### 1. Change Colors (Yoga Theme)
Edit `/tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      yoga: {
        50: '#your_light_color',
        100: '#your_lighter',
        500: '#your_primary',
        600: '#your_dark_primary',
        700: '#your_darker'
      }
    }
  }
}
```

### 2. Add Your Logo
Replace text logo in `/components/Navigation.tsx`:
```javascript
// Change this:
<span className="text-2xl font-bold text-yoga-700">🧘 Swar Yoga</span>

// To your logo:
<img src="/logo.png" alt="Swar Yoga" className="h-10" />
```

### 3. Modify Signup Fields
Edit `/app/signup/page.tsx` formData state to add/remove fields:
```javascript
const [formData, setFormData] = useState({
  // Add new field here:
  birthdayPreference: '', // example
  // ... existing fields
});
```

### 4. Change Form Validation Rules
In `/app/signup/page.tsx`, update `validateForm()` function:
```javascript
// Example: Require phone number
if (!formData.phone.trim()) {
  newErrors.phone = 'Phone number is required';
}
```

### 5. Update API Endpoint
The signup form sends data to `/api/auth/signup`. The backend expects:
```javascript
{
  name: string,
  email: string,
  password: string,
  phone?: string,
  country?: string,
  gender?: string,
  age?: number,
  profession?: string
}
```

### 6. Add Social Login (Google/Facebook)
You can integrate Supabase OAuth in the signin page:
```javascript
const handleGoogleLogin = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
  });
};
```

## 🗄️ MongoDB User Schema

The backend stores user data with this structure:
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  phone: String,
  country: String,
  state: String,
  gender: String,
  age: Number,
  profession: String,
  password: String (hashed with bcryptjs),
  createdAt: Date,
  updatedAt: Date
}
```

## 🔐 Authentication Flow

1. **User Signs Up**
   - Form validates locally
   - Data sent to `/api/auth/signup`
   - Password hashed with bcryptjs
   - User stored in MongoDB
   - JWT token generated
   - Token sent to frontend

2. **User Signs In**
   - Email & password validated
   - Password compared with hashed version
   - JWT token generated
   - Token stored in localStorage
   - User redirected to original page

3. **Protected Routes**
   - Token verified on each API request
   - Can check token in localStorage for UI updates

## 📱 Making Pages Mobile Responsive

All pages use Tailwind's responsive classes:
- `md:` = medium screens (768px+)
- `lg:` = large screens (1024px+)
- `xl:` = extra large (1280px+)

Example:
```jsx
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Single column on mobile, 2 on tablet, 3 on desktop */}
</div>
```

## 🚀 Deployment to Vercel

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Add Environment Variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click Deploy

### Step 3: Connect Domain
1. In Vercel dashboard → Project Settings → Domains
2. Add `swaryoga.com`
3. Follow DNS setup instructions
4. Can take 24-48 hours to fully propagate

## 📊 Next Steps (Create with Me)

What would you like me to create next?

1. **Enhanced Cart Page**
   - Save cart to localStorage
   - Persist between sessions
   - Add product images
   - Product quantity with +/- buttons

2. **Enhanced Checkout**
   - Payment gateway (Stripe/PayPal)
   - Order confirmation email
   - Inventory management

3. **User Dashboard** (`/account`)
   - View profile
   - Edit account info
   - View order history
   - Download receipts

4. **Products Page** (`/products`)
   - Product listings
   - Filter by category
   - Search functionality
   - Product detail pages

5. **Admin Dashboard** (`/admin`)
   - Manage products
   - View orders
   - Customer management
   - Sales analytics

6. **Life Planner**
   - User transformation tracker
   - Goal setting
   - Progress charts

## 🆘 Troubleshooting

### Module Not Found Errors
**Problem:** "Cannot find module 'react'"
**Solution:** Run `npm install` again or delete `node_modules` and reinstall

### Port 3000 Already in Use
**Solution:** 
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9
# Or use a different port
npm run dev -- -p 3001
```

### Tailwind Styles Not Working
**Solution:** Make sure globals.css is imported in layout.tsx and contains:
```css
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';
```

### MongoDB Connection Error
**Solution:** Check MONGODB_URI format and IP whitelist MongoDB Atlas

## 📚 File Structure

```
app/
├── layout.tsx (Root layout)
├── globals.css (Global styles)
├── page.tsx (Home)
├── about/page.tsx
├── contact/page.tsx
├── signup/page.tsx (NEW - Enhanced)
├── signin/page.tsx (NEW - Enhanced)
├── cart/page.tsx
├── checkout/page.tsx
├── thankyou/page.tsx
└── api/
    ├── auth/
    │   ├── signup/route.ts
    │   └── login/route.ts
    ├── orders/route.ts
    └── contact/route.ts

components/
├── Navigation.tsx
├── Footer.tsx
└── HeroSection.tsx

lib/
├── db.ts (MongoDB models)
├── supabase.ts (Supabase client)
└── auth.ts (JWT utilities)
```

---

**Ready to customize? Just tell me:**
- What changes would you like to make?
- Which page should we enhance next?
- Any features you want to add?

I'm here to help! 🎉
