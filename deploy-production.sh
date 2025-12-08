#!/bin/bash

# Swar Yoga Production Deployment Script
# Deploys to Vercel with latest code

set -e

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "                 🚀 SWAR YOGA PRODUCTION DEPLOYMENT"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

# Step 1: Verify Git status
echo "📋 Step 1: Checking Git status..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Uncommitted changes detected. Committing..."
    git add .
    git commit -m "chore: pre-deployment commit" || echo "No changes to commit"
else
    echo "✅ Git working directory clean"
fi
echo ""

# Step 2: Build locally to verify
echo "🔨 Step 2: Building application locally..."
npm run build
echo "✅ Build successful"
echo ""

# Step 3: Verify build output
echo "📦 Step 3: Verifying build output..."
if [ -d "dist" ] && [ -n "$(ls -A dist)" ]; then
    echo "✅ Build artifacts found in dist/"
    echo "   Files: $(find dist -type f | wc -l)"
else
    echo "❌ Build failed - dist/ directory empty"
    exit 1
fi
echo ""

# Step 4: Push to GitHub
echo "📤 Step 4: Pushing to GitHub..."
git push origin main
echo "✅ Pushed to GitHub main branch"
echo ""

# Step 5: Deploy to Vercel
echo "🌐 Step 5: Deploying to Vercel..."
echo "Note: If prompted, select your existing Vercel project"
echo ""

# Check Vercel auth
if vercel whoami &>/dev/null; then
    echo "✅ Vercel authenticated as: $(vercel whoami)"
    echo ""
    
    # Deploy with Vercel
    echo "Starting Vercel deployment..."
    vercel --prod \
        --token "${VERCEL_TOKEN}" \
        --confirm \
        2>&1 || {
        echo "⚠️  Vercel CLI deployment encountered an issue"
        echo "   Trying alternative approach..."
        vercel --prod --confirm
    }
else
    echo "❌ Not authenticated with Vercel"
    echo "   Run: vercel login"
    echo "   Then run: vercel --prod"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "                    ✅ DEPLOYMENT COMPLETE"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Visit your Vercel dashboard: https://vercel.com/dashboard"
echo "2. Verify the deployment completed successfully"
echo "3. Check your application at: https://your-project.vercel.app"
echo "4. Monitor deployment logs in Vercel dashboard"
echo ""
