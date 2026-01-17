#!/bin/bash

# sync-prod-to-vercel.sh
# Synchronizes essential production environment variables to Vercel
# Reads from .env.local by default

# Load environment variables
if [ -f .env.production ]; then
    echo "Loading variables from .env.production..."
    export $(grep -v '^#' .env.production | xargs)
elif [ -f .env.local ]; then
    echo "Loading variables from .env.local..."
    export $(grep -v '^#' .env.local | xargs)
fi

# Function to add/update Vercel env
set_vercel_env() {
  local key=$1
  local value=$2
  
  if [ -z "$value" ]; then
    echo "⚠️ Skipping $key (value is empty)"
    return
  fi

  echo "Setting $key on Vercel..."
  # Remove if exists to avoid "already exists" error
  echo "yes" | vercel env rm "$key" production 2>/dev/null
  # Add new value
  echo -n "$value" | vercel env add "$key" production
}

# 1. Bridge Variables (CRITICAL for QR)
set_vercel_env "WHATSAPP_BRIDGE_HTTP_URL" "$WHATSAPP_BRIDGE_HTTP_URL"
set_vercel_env "NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL" "$NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL"
set_vercel_env "WHATSAPP_BRIDGE_SECRET" "$WHATSAPP_BRIDGE_SECRET"
set_vercel_env "NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET" "$NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET"
set_vercel_env "WHATSAPP_WEB_BRIDGE_SECRET" "$WHATSAPP_WEB_BRIDGE_SECRET"

# 2. Meta API Variables
set_vercel_env "WHATSAPP_ACCESS_TOKEN" "$WHATSAPP_ACCESS_TOKEN"
set_vercel_env "WHATSAPP_PHONE_NUMBER_ID" "$WHATSAPP_PHONE_NUMBER_ID"
set_vercel_env "META_APP_SECRET" "$META_APP_SECRET"
set_vercel_env "WHATSAPP_WEBHOOK_VERIFY_TOKEN" "$WHATSAPP_WEBHOOK_VERIFY_TOKEN"

# 3. Database Variables
set_vercel_env "MONGODB_URI_MAIN" "$MONGODB_URI_MAIN"
set_vercel_env "MONGODB_CRM_DB_NAME" "$MONGODB_CRM_DB_NAME"
set_vercel_env "MONGODB_MAIN_DB_NAME" "$MONGODB_MAIN_DB_NAME"

# 4. AWS Variables
set_vercel_env "AWS_ACCESS_KEY_ID" "$AWS_ACCESS_KEY_ID"
set_vercel_env "AWS_SECRET_ACCESS_KEY" "$AWS_SECRET_ACCESS_KEY"
set_vercel_env "AWS_REGION" "$AWS_REGION"
set_vercel_env "AWS_S3_BUCKET" "$AWS_S3_BUCKET"

# 5. Cashfree Variables
set_vercel_env "CASHFREE_CLIENT_ID" "$CASHFREE_CLIENT_ID"
set_vercel_env "CASHFREE_CLIENT_SECRET" "$CASHFREE_CLIENT_SECRET"
set_vercel_env "CASHFREE_ENV" "$CASHFREE_ENV"
set_vercel_env "CASHFREE_API_VERSION" "$CASHFREE_API_VERSION"

echo "✅ Environment variables synced to Vercel."
echo "🚀 IMPORTANT: You must trigger a new deployment for these changes to take effect."
echo "   Run: vercel --prod"
