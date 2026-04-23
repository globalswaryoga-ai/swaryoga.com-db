#!/bin/bash

# 🚀 Quick Deploy Script for Vercel
# Usage: ./deploy.sh [--prod] [--check]

set -e

echo "🚀 Vercel Deployment Script"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check git status
echo -e "${BLUE}Step 1: Checking git status...${NC}"
if [[ -n $(git status -s) ]]; then
  echo -e "${RED}❌ Error: Uncommitted changes detected${NC}"
  echo "Please commit changes first:"
  echo "  git add ."
  echo "  git commit -m 'your message'"
  exit 1
fi
echo -e "${GREEN}✅ Git status clean${NC}"
echo ""

# Step 2: Check branch
echo -e "${BLUE}Step 2: Checking branch...${NC}"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
  echo -e "${RED}❌ Error: Not on main branch (current: $BRANCH)${NC}"
  echo "Switch to main first:"
  echo "  git checkout main"
  exit 1
fi
echo -e "${GREEN}✅ On main branch${NC}"
echo ""

# Step 3: Show latest commit
echo -e "${BLUE}Step 3: Latest commit:${NC}"
git log --oneline -1
echo ""

# Step 4: Deploy options
if [[ "$1" == "--check" ]]; then
  echo -e "${YELLOW}Mode: Check only (no deployment)${NC}"
  echo -e "${GREEN}✅ Ready to deploy! Run: ./deploy.sh${NC}"
  exit 0
fi

PROD_MODE=""
if [[ "$1" == "--prod" ]] || [[ "$1" == "" ]]; then
  PROD_MODE="--prod"
  echo -e "${YELLOW}🔴 Mode: PRODUCTION DEPLOYMENT${NC}"
else
  echo -e "${YELLOW}🟡 Mode: PREVIEW DEPLOYMENT${NC}"
fi
echo ""

# Step 5: Check Vercel CLI
echo -e "${BLUE}Step 5: Checking Vercel CLI...${NC}"
if ! command -v vercel &> /dev/null; then
  echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
  npm install -g vercel
fi
echo -e "${GREEN}✅ Vercel CLI available${NC}"
echo ""

# Step 6: Deploy
echo -e "${BLUE}Step 6: Deploying to Vercel...${NC}"
echo -e "${YELLOW}Starting deployment ($PROD_MODE)...${NC}"
echo ""

if [[ "$PROD_MODE" == "--prod" ]]; then
  vercel --prod --yes
else
  vercel --yes
fi

echo ""
echo -e "${GREEN}✅ Deployment started!${NC}"
echo ""
echo "📊 Monitor at: https://vercel.com/dashboard"
echo ""
