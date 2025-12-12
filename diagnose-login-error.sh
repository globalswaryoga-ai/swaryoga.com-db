#!/bin/bash
# diagnose-login-error.sh
# Quick diagnostic script for login 500 error

echo "🔍 Diagnosing Login 500 Error"
echo "=============================="
echo ""

# Check 1: Environment variables
echo "1️⃣  Checking Environment Variables..."
if [ -f ".env.local" ]; then
  echo "   ✅ .env.local exists"
  if grep -q "MONGODB_URI" .env.local; then
    echo "   ✅ MONGODB_URI is set in .env.local"
    # Don't print the actual value for security
    echo "   ✅ Value length: $(grep MONGODB_URI .env.local | cut -d= -f2 | wc -c) characters"
  else
    echo "   ❌ MONGODB_URI is NOT set in .env.local"
  fi
  
  if grep -q "JWT_SECRET" .env.local; then
    echo "   ✅ JWT_SECRET is set in .env.local"
  else
    echo "   ⚠️  JWT_SECRET is NOT set (using default fallback)"
  fi
else
  echo "   ❌ .env.local DOES NOT EXIST"
  echo "   👉 Create .env.local with MONGODB_URI and JWT_SECRET"
fi
echo ""

# Check 2: Database models
echo "2️⃣  Checking Database Models..."
if grep -q "export const User" lib/db.ts; then
  echo "   ✅ User model is exported"
else
  echo "   ❌ User model is NOT exported"
fi

if grep -q "export const Signin" lib/db.ts; then
  echo "   ✅ Signin model is exported"
else
  echo "   ❌ Signin model is NOT exported"
fi
echo ""

# Check 3: Login route
echo "3️⃣  Checking Login Route..."
if grep -q "import.*Signin.*from.*db" app/api/auth/login/route.ts; then
  echo "   ✅ Login route imports Signin model"
else
  echo "   ❌ Login route does NOT import Signin"
fi

if grep -q "connectDB" app/api/auth/login/route.ts; then
  echo "   ✅ Login route connects to database"
else
  echo "   ❌ Login route does NOT connect to database"
fi
echo ""

# Check 4: Auth utilities
echo "4️⃣  Checking Auth Utilities..."
if [ -f "lib/auth.ts" ]; then
  echo "   ✅ lib/auth.ts exists"
  if grep -q "generateToken" lib/auth.ts; then
    echo "   ✅ generateToken function exists"
  fi
else
  echo "   ❌ lib/auth.ts NOT FOUND"
fi
echo ""

# Check 5: Suggestions
echo "5️⃣  Next Steps..."
echo "   a) Create .env.local if not exists:"
echo "      → Add MONGODB_URI=mongodb+srv://..."
echo "      → Add JWT_SECRET=your_secret"
echo ""
echo "   b) Verify MongoDB URI is valid:"
echo "      → Format: mongodb+srv://user:pass@host/db"
echo "      → Check MongoDB Atlas for correct URI"
echo ""
echo "   c) Restart dev server:"
echo "      → Stop: Press Ctrl+C"
echo "      → Start: npm run dev"
echo ""
echo "   d) Check server logs for errors:"
echo "      → Look for 'MONGODB_URI' or 'connection' errors"
echo ""

echo "✅ Diagnostic complete!"
