#!/bin/bash

# Check which database has the leads data
echo "=== CHECKING MONGODB DATABASES ==="
echo ""
echo "Connection String in .env:"
grep "MONGODB_URI" .env.local | head -2
echo ""
echo "Database Name Override:"
grep "MONGODB_MAIN_DB_NAME" .env.local
echo ""
echo "In connectDB():"
echo "  - Connection URI ends with: /swaryogaDB"
echo "  - But dbName option sets: swaryoga_admin_crm"
echo ""
echo "Result:"
echo "  ✅ Queries run against: swaryoga_admin_crm"
echo "  ❌ But old leads might be in: swaryogaDB"
echo ""
echo "To verify, we need to:"
echo "  1. Connect to MongoDB"
echo "  2. Count leads in swaryogaDB"
echo "  3. Count leads in swaryoga_admin_crm"
echo "  4. Either migrate or fix configuration"
