#!/bin/bash

# sync-prod-to-vercel.sh
# Synchronizes essential production environment variables from .env.production to Vercel

echo "Pulling environment variables from .env.production..."

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
BRIDGE_IP="http://3.109.154.61:3333"
set_vercel_env "WHATSAPP_BRIDGE_HTTP_URL" "$BRIDGE_IP"
set_vercel_env "NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL" "$BRIDGE_IP"
set_vercel_env "WHATSAPP_BRIDGE_SECRET" "swar-bridge-secret-2024"
set_vercel_env "NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET" "swar-bridge-secret-2024"
set_vercel_env "WHATSAPP_WEB_BRIDGE_SECRET" "swar-bridge-secret-2024"

# 2. Meta API Variables
set_vercel_env "WHATSAPP_ACCESS_TOKEN" "EAAZA17SDRZATgBQU6L6BlN4nqTAWP2m1IyfyolhJQhCFhY5FU1bUJtG28mgy1Tt7sTu9b16kuC4aL0bSJIhC9rPJl44p23PACTA9z2AiDHu3PNGicikNZAgwmJWNktHxOebIqk7ZBKcUpbwNFR832ZAD5OvTbI3jZA6mBVMrhcGJqjQf9YACozjyYA5unF6yXbJAZDZD"
set_vercel_env "WHATSAPP_PHONE_NUMBER_ID" "733788303156745"
set_vercel_env "META_APP_SECRET" "ce4bf92f6be0c7bace755a216cbf1ef2"
set_vercel_env "WHATSAPP_WEBHOOK_VERIFY_TOKEN" "SWAR_YOGA_MOHAN_WT_SETUP"

# 3. Database Variables
set_vercel_env "MONGODB_URI_MAIN" "mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority"
set_vercel_env "MONGODB_CRM_DB_NAME" "swaryoga_admin_crm"
set_vercel_env "MONGODB_MAIN_DB_NAME" "swaryogaDB"

echo "✅ Environment variables synced to Vercel."
echo "🚀 IMPORTANT: You must trigger a new deployment for these changes to take effect."
echo "   Run: vercel --prod"
