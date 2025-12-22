# Swar Yoga Environment Configuration Guide

**Last Updated:** December 22, 2025  
**Target Environment:** Production & Development

---

## Overview

This document outlines all required and optional environment variables for the Swar Yoga application.

### Quick Setup

```bash
# Copy template to .env.local
cp .env.example .env.local

# Fill in required values
nano .env.local

# Dev server picks up changes automatically
npm run dev
```

---

## Required Environment Variables

### Database Configuration

```bash
# MongoDB Connection String
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/swar-yoga
```

**Required:** Yes  
**Description:** Connection string to MongoDB Atlas  
**Format:** `mongodb+srv://[username]:[password]@[cluster].mongodb.net/[database]`  
**Where to get:** MongoDB Atlas Dashboard → Database → Connect → Connection String  
**Security:** Never commit to Git; use `.env.local` or secrets manager

### JWT Authentication

```bash
# JWT Secret for token signing
JWT_SECRET=your-super-secret-random-key-min-32-characters
```

**Required:** Yes  
**Description:** Secret key for signing JWT tokens  
**Format:** Random alphanumeric string, minimum 32 characters  
**Security:** Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`  
**Rotation:** Change and redeploy to invalidate existing tokens

### PayU Payment Gateway

```bash
# PayU Merchant Configuration
PAYU_MERCHANT_KEY=MERCHANT_KEY_FROM_PAYU
PAYU_MERCHANT_SALT=MERCHANT_SALT_FROM_PAYU
PAYU_MODE=production  # or 'development' for test mode
```

**Required:** Yes (for payment features)  
**Description:** PayU merchant credentials for payment processing  
**Where to get:** PayU Dashboard → Settings → Merchant Settings  
**PAYU_MODE Values:**
- `production` - Live payment processing
- `development` - PayU test/sandbox mode

**Test Credentials (Development):**
```bash
PAYU_MERCHANT_KEY=TESTMERCHANT
PAYU_MERCHANT_SALT=TESTSALT@123
PAYU_MODE=development
```

---

## Optional Environment Variables

### Application Configuration

```bash
# Node Environment
NODE_ENV=production  # or 'development'

# Application Port (for self-hosted)
PORT=3000

# Log Level
LOG_LEVEL=info  # debug, info, warn, error
```

### Payment Configuration Overrides

```bash
# Override payment gateway behavior (optional, advanced use)
NEXT_PUBLIC_PAYMENT_OVERRIDES={"disablePayments": false}
```

**Note:** Changes require rebuild to take effect:
```bash
npm run build
npm start
```

### Feature Flags

```bash
# Enable/disable features
NEXT_PUBLIC_ENABLE_WORKSHOPS=true
NEXT_PUBLIC_ENABLE_PAYMENTS=true
NEXT_PUBLIC_ENABLE_LIFE_PLANNER=true
```

### Debugging

```bash
# PayU Debug Logging
DEBUG_PAYU=1  # Set to enable verbose PayU request/response logging

# MongoDB Debug
DEBUG_MONGODB=1  # Set to enable MongoDB operation logging
```

---

## Environment-Specific Configurations

### Development (`.env.local`)

```bash
# Database
MONGODB_URI=mongodb+srv://dev-user:dev-password@dev-cluster.mongodb.net/swar-yoga-dev

# JWT
JWT_SECRET=dev-secret-key-not-for-production-use-min-32-chars

# PayU (use test credentials)
PAYU_MERCHANT_KEY=TESTMERCHANT
PAYU_MERCHANT_SALT=TESTSALT@123
PAYU_MODE=development

# Debug Flags
NODE_ENV=development
DEBUG_PAYU=1
DEBUG_MONGODB=1
```

### Production (`.env.production`)

```bash
# Database (production cluster)
MONGODB_URI=mongodb+srv://prod-user:prod-secure-password@prod-cluster.mongodb.net/swar-yoga

# JWT (strong secret)
JWT_SECRET=<generated-strong-random-secret>

# PayU (live credentials)
PAYU_MERCHANT_KEY=<actual-merchant-key>
PAYU_MERCHANT_SALT=<actual-merchant-salt>
PAYU_MODE=production

# No debug flags
NODE_ENV=production
```

---

## Security Best Practices

### Environment Variable Management

1. **Never commit `.env.local`** to Git
2. **Use secret managers** for production:
   - Vercel Secrets (for Vercel deployment)
   - AWS Secrets Manager
   - HashiCorp Vault
   - Doppler

3. **Rotate secrets** regularly:
   - JWT_SECRET every 90 days
   - Database passwords every 6 months
   - PayU credentials when compromised

4. **Use strong passwords:**
   - Database: 16+ characters, mixed case, numbers, symbols
   - JWT: 32+ characters, cryptographically random
   - API Keys: Service provider's recommendations

### Access Control

```bash
# File permissions (development)
chmod 600 .env.local  # Read/write owner only

# Git ignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
echo ".env.production" >> .gitignore
```

### Secret Rotation Procedure

1. Generate new secret value
2. Set in target environment
3. Redeploy application
4. Verify functionality
5. Update backup/reference
6. Delete old secret
7. Document rotation date

---

## Environment Variables by Feature

### Auth Endpoints

| Endpoint | Required Variables |
|----------|-------------------|
| POST /api/auth/signup | MONGODB_URI, JWT_SECRET |
| POST /api/auth/login | MONGODB_URI, JWT_SECRET |

### Accounting Features

| Endpoint | Required Variables |
|----------|-------------------|
| GET /api/accounting/budget | MONGODB_URI |
| GET /api/accounting/accounts | MONGODB_URI |
| GET /api/accounting/transactions | MONGODB_URI |

### Payment Processing

| Endpoint | Required Variables |
|----------|-------------------|
| POST /api/payments/payu/initiate | PAYU_MERCHANT_KEY, PAYU_MERCHANT_SALT, PAYU_MODE |
| POST /api/payments/payu/callback | PAYU_MERCHANT_KEY, PAYU_MERCHANT_SALT |

### Workshop Management

| Endpoint | Required Variables |
|----------|-------------------|
| GET /api/workshops/schedules | MONGODB_URI |

---

## Deployment Checklist

### Before Deploying to Production

- [ ] All required variables set in environment
- [ ] Database credentials verified and tested
- [ ] JWT_SECRET is cryptographically random (32+ chars)
- [ ] PayU credentials are for production (not test)
- [ ] PAYU_MODE set to 'production'
- [ ] NODE_ENV set to 'production'
- [ ] Debug flags (DEBUG_PAYU, DEBUG_MONGODB) not set
- [ ] `.env.local` never committed to Git
- [ ] All tests passing locally
- [ ] Build succeeds: `npm run build`

### Post-Deployment Verification

```bash
# Test API connectivity
curl -X GET https://swaryoga.com/api/debug/env-check

# Check database connection
curl -X GET https://swaryoga.com/api/debug/connection

# Monitor logs for errors
curl -X GET https://swaryoga.com/api/debug/logs?action=stats
```

---

## Troubleshooting

### "MONGODB_URI environment variable is not set"

**Solution:**
```bash
# Add to .env.local
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/swar-yoga

# Verify
echo $MONGODB_URI
```

### "Token verification failed"

**Solution:**
- Verify JWT_SECRET is set and consistent
- Check token hasn't expired (7-day expiry)
- Ensure JWT_SECRET matches between signing and verification

### "PayU 403 Forbidden"

**Solution:**
1. Verify PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT are correct
2. Check PAYU_MODE matches merchant account type
3. Verify merchant account is active in PayU
4. Check IP whitelist in PayU settings

### "Database connection timeout"

**Solution:**
1. Verify MONGODB_URI format is correct
2. Check MongoDB Atlas IP whitelist includes your IP
3. Test connection: `node test-mongodb.js`
4. Check network connectivity: `ping cluster.mongodb.net`

---

## Environment Variables File Template

```bash
# .env.local (copy and fill this in)

# ============= REQUIRED =============

# Database Configuration
MONGODB_URI=

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=

# PayU Credentials
PAYU_MERCHANT_KEY=
PAYU_MERCHANT_SALT=
PAYU_MODE=development

# ============= OPTIONAL =============

# Application
NODE_ENV=development
PORT=3000

# Debugging (set to 1 to enable)
DEBUG_PAYU=
DEBUG_MONGODB=
```

---

## Quick Reference

### Generate Random Secrets

```bash
# Generate JWT_SECRET (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate secure password (bash)
openssl rand -base64 32
```

### Load Environment Variables

```bash
# Development (automatic with npm run dev)
# .env.local is loaded by Next.js

# Production (Vercel)
# Set in Vercel dashboard: Settings → Environment Variables

# Self-hosted (add to systemd/pm2)
# systemctl set-environment VAR=value
# Or set in ecosystem.config.js for PM2
```

### Verify Variables Are Loaded

```bash
# Check if variables are accessible
npm run dev

# In browser console
fetch('/api/debug/env-check').then(r => r.json()).then(console.log)
```

---

## Support

For environment-related issues:
- Check `.env.local` exists and is readable
- Verify all required variables are set
- Restart dev server after changes: `npm run dev`
- Check logs for specific error messages
- Use debug endpoints to diagnose issues

---

**Last Updated:** December 22, 2025  
**Maintained By:** Swar Yoga Engineering Team
