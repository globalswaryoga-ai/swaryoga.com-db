# 🔐 Environment Variables Setup Guide

## Your MongoDB Connection

Your MongoDB Atlas cluster is ready! Here's your connection string:

```
mongodb+srv://swarsakshi9_db_user:<db_password>@swaryogadb.dheqmu1.mongodb.net/swar_yoga_db
```

### Setup Instructions

#### Step 1: Create `.env.local` File

In the root directory of your project, create a new file called `.env.local` (same level as `package.json`):

```bash
touch .env.local
```

#### Step 2: Add MongoDB Password

Replace `<db_password>` with your actual MongoDB password and paste into `.env.local`:

```
MONGODB_URI=mongodb+srv://swarsakshi9_db_user:YOUR_PASSWORD_HERE@swaryogadb.dheqmu1.mongodb.net/swar_yoga_db
```

**Example:**
```
MONGODB_URI=mongodb+srv://swarsakshi9_db_user:MySecure123Pass@swaryogadb.dheqmu1.mongodb.net/swar_yoga_db
```

#### Step 3: Add Other Required Variables

Complete your `.env.local` file:

```env
# ===== MONGODB (Required) =====
MONGODB_URI=mongodb+srv://swarsakshi9_db_user:<your_password>@swaryogadb.dheqmu1.mongodb.net/swar_yoga_db

# ===== JWT SECRET (Required) =====
# Generate a strong random string (min 32 characters)
# You can use: openssl rand -base64 32
JWT_SECRET=your_very_long_random_string_of_at_least_32_characters

# ===== API CONFIGURATION (Required) =====
NEXT_PUBLIC_API_URL=http://localhost:3000

# ===== SUPABASE (Optional - for authentication) =====
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ===== EMAIL CONFIGURATION (Optional - for notifications) =====
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
ADMIN_EMAIL=admin@swaryoga.com
```

## 🔑 Generate JWT Secret

### Option 1: Using OpenSSL (Terminal)
```bash
openssl rand -base64 32
```

**Output example:**
```
a7f3K9mL2pQ8vX5bY1cZ4dN6eJ9sH0wT3uR2vM8pL5qK7n
```

### Option 2: Using Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Option 3: Online Generator
Visit: https://www.random.org/strings/ and generate 32 characters

## 🗄️ MongoDB Atlas Setup Verification

Your MongoDB cluster details:
- **Cluster Name:** swaryogadb
- **Username:** swarsakshi9_db_user
- **Database:** swar_yoga_db
- **Connection String:** `mongodb+srv://swarsakshi9_db_user:<password>@swaryogadb.dheqmu1.mongodb.net/`

### Verify Connection (Optional)

You can test your connection using MongoDB Compass:

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Open Compass
3. Paste your connection string with password
4. Click "Connect"
5. You should see your `swar_yoga_db` database

## ✅ Environment File Checklist

Before running `npm run dev`, ensure `.env.local` has:

- [ ] `MONGODB_URI` - Your MongoDB connection string with password
- [ ] `JWT_SECRET` - Random 32+ character string
- [ ] `NEXT_PUBLIC_API_URL` - Set to `http://localhost:3000` for development

**Optional (but recommended):**
- [ ] `SUPABASE_URL` and `SUPABASE_ANON_KEY` - For authentication
- [ ] Email configuration - For contact form notifications

## 🚀 Running the Application

Once `.env.local` is set up:

```bash
npm install
npm run dev
```

The application will:
1. ✅ Connect to your MongoDB database
2. ✅ Generate JWT tokens for authentication
3. ✅ Create user accounts in MongoDB
4. ✅ Handle user login/logout

## 🔒 Security Best Practices

### DO:
- ✅ Keep `.env.local` **private** - Never commit to Git
- ✅ Use strong passwords for MongoDB (20+ characters)
- ✅ Rotate JWT_SECRET periodically
- ✅ Use HTTPS in production
- ✅ Set MongoDB IP whitelist in Atlas

### DON'T:
- ❌ Don't expose `.env.local` in version control
- ❌ Don't use weak passwords
- ❌ Don't share your credentials in messages
- ❌ Don't use `localhost:3000` for production API URL
- ❌ Don't commit environment files to GitHub

## 📁 .gitignore Configuration

Ensure `.gitignore` contains:
```
.env.local
.env.*.local
node_modules/
.next/
.vercel/
```

This prevents accidentally pushing your secrets to GitHub.

## 🔍 Troubleshooting

### Connection Timeout Error
```
Error: connect ECONNREFUSED
```
**Solutions:**
- Check MongoDB password is correct
- Verify MongoDB cluster is online at Atlas dashboard
- Check IP whitelist includes your current IP
- Ensure MONGODB_URI doesn't have typos

### JWT Secret Not Set
```
Error: JWT_SECRET is not defined
```
**Solution:**
- Add `JWT_SECRET=your_secret_here` to `.env.local`
- Restart `npm run dev`

### Cannot Find Module Error
```
Error: Cannot find module '@/lib/db'
```
**Solution:**
- Run `npm install` to install all dependencies
- Check that `lib/db.ts` file exists

## 📊 MongoDB Collections

Your database will automatically create these collections when users interact with the app:

### Users Collection
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
  password: String (hashed),
  createdAt: Date,
  updatedAt: Date
}
```

### Orders Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (reference to User),
  items: Array,
  total: Number,
  status: String,
  shippingAddress: Object,
  createdAt: Date
}
```

### Contacts Collection
```javascript
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

## 🌐 Production Environment Variables

When deploying to Vercel, add these same variables in:

**Vercel Dashboard → Project Settings → Environment Variables**

⚠️ **Important:** Use production-level values for:
- `MONGODB_URI` - Your production MongoDB cluster (or same one)
- `JWT_SECRET` - Use a different, more secure secret
- `NEXT_PUBLIC_API_URL` - Change to your production domain (e.g., `https://swaryoga.com`)

## 📞 Support

If you have issues with MongoDB connection:

1. **Check MongoDB Atlas:**
   - Visit: https://www.mongodb.com/cloud/atlas
   - Login with your account
   - Click "swaryogadb" cluster
   - Check "Deployment" status

2. **Verify Credentials:**
   - Username: `swarsakshi9_db_user`
   - Database: `swar_yoga_db`
   - Password: Check your password manager

3. **Contact MongoDB Support:**
   - Visit: https://support.mongodb.com

---

**Your MongoDB is ready!** 
Next step: Run `npm install && npm run dev` 🚀
