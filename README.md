# Swar Yoga - Full Stack E-Commerce Platform

A modern, fully-responsive e-commerce website for Swar Yoga with authentication, shopping cart, checkout, and admin features.

## 🚀 Tech Stack

**Frontend:**
- Next.js 14 (React 18)
- TypeScript
- Tailwind CSS
- Supabase Authentication

**Backend:**
- Next.js API Routes (TypeScript)
- MongoDB Atlas
- Mongoose
- JWT Authentication
- bcryptjs for password hashing

**Hosting:**
- Vercel (deployment)

**Database:**
- MongoDB Atlas (primary)
- Supabase (optional authentication)

## 📁 Project Structure

```
swar-yoga-web-mohan/
├── app/
│   ├── api/                    # Backend API routes
│   │   ├── auth/
│   │   │   ├── signup/route.ts
│   │   │   └── login/route.ts
│   │   ├── orders/route.ts
│   │   ├── contact/route.ts
│   ├── layout.tsx              # Root layout
│   ├── globals.css             # Global styles
│   ├── page.tsx                # Home page
│   ├── about/page.tsx          # About page
│   ├── contact/page.tsx        # Contact page
│   ├── signin/page.tsx         # Sign in page
│   ├── signup/page.tsx         # Sign up page
│   ├── cart/page.tsx           # Shopping cart
│   ├── checkout/page.tsx       # Checkout page
│   └── thankyou/page.tsx       # Order confirmation
├── components/
│   ├── Navigation.tsx          # Header/Navigation
│   ├── Footer.tsx              # Footer
│   └── HeroSection.tsx         # Homepage hero
├── lib/
│   ├── db.ts                   # MongoDB & Mongoose models
│   ├── supabase.ts             # Supabase client
│   └── auth.ts                 # JWT utilities
├── styles/
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
├── postcss.config.js
├── vercel.json
└── .env.example
```

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/swar_yoga

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# JWT Secret for backend
JWT_SECRET=your_very_secure_jwt_secret_key_here
```

### 3. Setup MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Replace `MONGODB_URI` in `.env.local`

### 4. Setup Supabase (Optional for Auth)

1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Copy your API URL and Anon Key
4. Update `.env.local` with Supabase credentials

## 🏃 Running Locally

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 📦 Building for Production

```bash
npm run build
npm start
```

## 📄 Pages and Features

### Home Page (`/`)
- Hero section with call-to-action
- Featured products grid
- Direct navigation to shopping

### About Page (`/about`)
- Company mission and values
- Key information about Swar Yoga

### Contact Page (`/contact`)
- Contact form with validation
- Company contact information
- Office hours and location

### Sign Up Page (`/signup`)
- User registration form
- Password confirmation validation
- MongoDB user creation with hashed passwords

### Sign In Page (`/signin`)
- Login form
- Email and password validation
- JWT token generation

### Cart Page (`/cart`)
- View cart items
- Modify quantities
- Remove items
- Order summary with taxes

### Checkout Page (`/checkout`)
- Shipping information form
- Payment information form
- Order summary
- Form validation

### Thank You Page (`/thankyou`)
- Order confirmation message
- Order details
- Contact information

## 🔐 Authentication

The application uses JWT tokens for authentication:

1. User signs up → Password hashed with bcryptjs → User stored in MongoDB
2. User signs in → Password verified → JWT token generated
3. Token stored in localStorage on client
4. Token sent in Authorization header for protected requests

## 🛒 Shopping Cart

- Cart items stored in component state
- Can be enhanced to use localStorage or Redux
- Cart persists across navigation
- Quantity management
- Tax calculation (8%)

## 📧 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders?userId=id` - Get user's orders

### Contact
- `POST /api/contact` - Submit contact form

## 🎨 Styling

The project uses Tailwind CSS with custom yoga-themed colors:

```
yoga-50: #f8f5f0
yoga-100: #ede5d8
yoga-500: #c9934f
yoga-600: #b8793d
yoga-700: #9d5f2e
```

## 📱 Responsive Design

- Mobile-first approach
- Responsive navigation with hamburger menu
- Mobile-optimized forms and tables
- Touch-friendly buttons and inputs

## 🚀 Deployment to Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables in Vercel dashboard
5. Deploy automatically

### Domain Setup

To connect `swaryoga.com`:

1. In Vercel dashboard, go to Project Settings > Domains
2. Add custom domain: `swaryoga.com`
3. Update DNS records in your domain registrar:
   - `A` record pointing to Vercel IP
   - `CNAME` for `www` subdomain

## 📝 Database Models

### User
```typescript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  createdAt: Date,
  updatedAt: Date
}
```

### Order
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  items: Array,
  total: Number,
  status: String,
  shippingAddress: Object,
  createdAt: Date,
  updatedAt: Date
}
```

### Contact
```typescript
{
  _id: ObjectId,
  name: String,
  email: String,
  subject: String,
  message: String,
  status: String,
  createdAt: Date
}
```

## 🔄 Next Steps / Future Enhancements

- [ ] Product management dashboard
- [ ] Payment gateway integration (Stripe/PayPal)
- [ ] Email notifications
- [ ] Order tracking
- [ ] User profile management
- [ ] Product reviews and ratings
- [ ] Wishlist functionality
- [ ] Admin panel
- [ ] Analytics dashboard
- [ ] Inventory management

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

MIT License - feel free to use this project for your purposes.

## 📞 Support

For questions or support, reach out to: hello@swaryoga.com

---

**Made with ❤️ for Swar Yoga**
