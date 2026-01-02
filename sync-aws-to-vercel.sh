#!/bin/bash

# Sync AWS credentials from .env.local to Vercel production environment
# This script requires Vercel CLI to be installed and you to be logged in

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.local"

echo "📋 AWS to Vercel Sync Script"
echo "============================"
echo ""

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env.local not found at $ENV_FILE"
    exit 1
fi

# Extract AWS values from .env.local
AWS_REGION=$(grep "^AWS_REGION=" "$ENV_FILE" | cut -d'=' -f2)
AWS_S3_BUCKET=$(grep "^AWS_S3_BUCKET=" "$ENV_FILE" | cut -d'=' -f2)
AWS_ACCESS_KEY_ID=$(grep "^AWS_ACCESS_KEY_ID=" "$ENV_FILE" | cut -d'=' -f2)
AWS_SECRET_ACCESS_KEY=$(grep "^AWS_SECRET_ACCESS_KEY=" "$ENV_FILE" | cut -d'=' -f2)

# Validate that all AWS vars are present
if [ -z "$AWS_REGION" ] || [ -z "$AWS_S3_BUCKET" ] || [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "❌ Error: AWS credentials not found in .env.local"
    echo ""
    echo "Make sure these lines exist in .env.local:"
    echo "  AWS_REGION=us-east-1"
    echo "  AWS_S3_BUCKET=socialmedia-post.com"
    echo "  AWS_ACCESS_KEY_ID=..."
    echo "  AWS_SECRET_ACCESS_KEY=..."
    exit 1
fi

echo "✅ Found AWS credentials in .env.local:"
echo "   AWS_REGION: $AWS_REGION"
echo "   AWS_S3_BUCKET: $AWS_S3_BUCKET"
echo "   AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID:0:10}... (hidden)"
echo "   AWS_SECRET_ACCESS_KEY: ••••••••••••••••••• (hidden)"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Error: Vercel CLI not found. Install it with:"
    echo "   npm i -g vercel"
    exit 1
fi

echo "📦 Vercel CLI found. Proceeding..."
echo ""

# Check if linked to a Vercel project (optional; vercel env add will prompt if needed)
echo "🔗 Syncing credentials to Vercel (production environment)..."
echo ""

# Add each environment variable
echo "→ Adding AWS_REGION..."
echo "$AWS_REGION" | vercel env add AWS_REGION production

echo "✅ AWS_REGION added"
echo ""

echo "→ Adding AWS_S3_BUCKET..."
echo "$AWS_S3_BUCKET" | vercel env add AWS_S3_BUCKET production

echo "✅ AWS_S3_BUCKET added"
echo ""

echo "→ Adding AWS_ACCESS_KEY_ID..."
echo "$AWS_ACCESS_KEY_ID" | vercel env add AWS_ACCESS_KEY_ID production

echo "✅ AWS_ACCESS_KEY_ID added"
echo ""

echo "→ Adding AWS_SECRET_ACCESS_KEY..."
echo "$AWS_SECRET_ACCESS_KEY" | vercel env add AWS_SECRET_ACCESS_KEY production

echo "✅ AWS_SECRET_ACCESS_KEY added"
echo ""

echo "🚀 All credentials synced! Now redeploying..."
echo ""

vercel --prod

echo ""
echo "✅ Done! Your Vercel environment now has AWS credentials."
echo ""
