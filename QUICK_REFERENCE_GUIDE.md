# 🚀 Swar Yoga - Quick Reference Guide

**Last Updated:** December 22, 2025  
**For:** Developers, DevOps, and Contributors

---

## 📚 Documentation Map

| Document | Purpose | For Whom |
|----------|---------|----------|
| [README_PROJECT.md](README_PROJECT.md) | **START HERE** - Project overview | Everyone |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | Complete API reference | Backend Developers |
| [DATABASE_SCHEMA_DOCUMENTATION.md](DATABASE_SCHEMA_DOCUMENTATION.md) | Database models & queries | Database/Backend Developers |
| [ENV_CONFIGURATION_GUIDE.md](ENV_CONFIGURATION_GUIDE.md) | Environment setup | DevOps/Local Setup |
| [DEVELOPMENT_WORKFLOW_GUIDE.md](DEVELOPMENT_WORKFLOW_GUIDE.md) | Dev best practices | All Developers |
| [AUTONOMOUS_IMPROVEMENTS_SUMMARY.md](AUTONOMOUS_IMPROVEMENTS_SUMMARY.md) | Recent changes (Dec 22) | Code Reviewers |

---

## 🏃 Quick Start (5 minutes)

### Setup
```bash
git clone https://github.com/globalswaryoga-ai/swaryoga.com-db.git
cd swaryoga.com-db
npm install
cp .env.example .env.local
# Edit .env.local with MongoDB URI and JWT_SECRET
```

### Run Development Server
```bash
npm run dev
# App at http://localhost:3000
```

### Verify Setup
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build
npm run build
```

---

## 🔐 Essential Environment Variables

```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=<32+ random characters>
PAYU_MERCHANT_KEY=<from PayU>
PAYU_MERCHANT_SALT=<from PayU>
PAYU_MODE=development  # or production
```

Get strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📡 Essential API Endpoints

### Authentication
```
POST /api/auth/signup      # User registration
POST /api/auth/login       # User login (returns JWT token)
```

### Accounting
```
GET  /api/accounting/budget        # Get budget plan
GET  /api/accounting/accounts      # List accounts
POST /api/accounting/accounts      # Create account
GET  /api/accounting/transactions  # List transactions
```

### Payments
```
POST /api/payments/payu/initiate   # Start payment
POST /api/payments/payu/callback   # Payment webhook
```

### Debug
```
GET /api/debug/env-check      # Verify environment
GET /api/debug/connection     # Test DB connection
GET /api/debug/logs           # View request logs
```

Full reference: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

## 🗄️ Core Database Models

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| User | User accounts | email, password, profile |
| Budget | Budget planning | year, allocations, income |
| Account | Financial accounts | type, balance, bankName |
| Transaction | Income/expenses | amount, type, category, date |
| Workshop | Course definitions | slug, title, active |
| WorkshopSchedule | Session schedules | date, mode, language, fees |
| Order | Workshop registrations | payuTxnId, paymentStatus, amount |
| Signin | Login audit trail | email, userId, ipAddress |

Full schema: [DATABASE_SCHEMA_DOCUMENTATION.md](DATABASE_SCHEMA_DOCUMENTATION.md)

---

## ⚙️ Common Commands

### Development
```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run type-check       # TypeScript check
npm run lint             # ESLint check
npm run lint -- --fix    # Auto-fix linting
```

### Testing
```bash
npm test                      # Run tests
node test-mongodb.js          # Test DB connection
node test-payu-integration.js # Test PayU
DEBUG_PAYU=1 npm run dev      # Debug PayU
```

### Deployment
```bash
npm run build         # Build for production
npm start             # Start production server (local)
npm run pm2:start     # Start with PM2
npm run pm2:deploy    # Deploy with PM2
./auto-deploy.sh      # Automated deployment
```

---

## 🔒 Security Features

| Feature | Status | Details |
|---------|--------|---------|
| **Rate Limiting** | ✅ Active | Login: 10/min, Signup: 5/10min |
| **JWT Auth** | ✅ Active | 7-day expiry, secure verification |
| **Password Hashing** | ✅ Active | bcryptjs (10 salt rounds) |
| **Request Logging** | ✅ Active | Structured logs with request IDs |
| **Input Validation** | ✅ Active | Email regex, age range, required fields |
| **Error Standardization** | ✅ Active | Consistent format, 10 error codes |

---

## 🐛 Debugging

### View Recent Logs
```bash
curl 'http://localhost:3000/api/debug/logs?action=logs&limit=50'
```

### View Statistics
```bash
curl 'http://localhost:3000/api/debug/logs?action=stats'
```

### View User Logs
```bash
curl 'http://localhost:3000/api/debug/logs?action=user-logs&userId=USER_ID'
```

### Enable Debug Logs
```bash
DEBUG_PAYU=1 npm run dev        # PayU debugging
DEBUG_MONGODB=1 npm run dev     # MongoDB debugging
```

---

## 📊 Key Metrics

| Metric | Value |
|--------|-------|
| Pages | 147 static/dynamic |
| API Endpoints | 20+ |
| Database Models | 8 |
| Build Time | ~60-90s |
| Page Load JS | 88.3 kB (shared) |
| Uptime Target | 99.9%+ |
| Response Time | < 200ms |

---

## 🎯 Code Standards

### TypeScript
```typescript
// Always type function parameters and return values
async function fetchUser(id: string): Promise<User | null> {
  return await User.findById(id).lean();
}
```

### Error Handling
```typescript
import { apiError, apiSuccess } from '@/lib/api-error';

// Error response
return apiError('VALIDATION_ERROR', 'Email is required');

// Success response
return apiSuccess({ message: 'Success', data: user });
```

### Database Queries
```typescript
// Always use .lean() for reads
const users = await User.find()
  .select('name email')  // Limit fields
  .lean()                // Read-only
  .limit(100);           // Limit results
```

### Logging
```typescript
import { createRequestContext, logRequest, logResponse } from '@/lib/logging';

const context = createRequestContext(request);
logRequest(context, 'Operation started');
// ... do work ...
logResponse(context, 200, timer.elapsed(), 'Operation completed');
```

Full guide: [DEVELOPMENT_WORKFLOW_GUIDE.md](DEVELOPMENT_WORKFLOW_GUIDE.md)

---

## 🔄 Git Workflow

### Create Feature
```bash
git checkout -b feature/your-feature-name
git add .
git commit -m "feat: add new feature"
git push origin feature/your-feature-name
# Create Pull Request on GitHub
```

### Commit Types
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `perf:` Performance
- `security:` Security fix
- `chore:` Build/dependency

---

## 🚀 Deployment Checklist

- [ ] All tests passing locally
- [ ] `npm run build` succeeds
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] Environment variables set in production
- [ ] `.env.local` not committed
- [ ] Code reviewed
- [ ] PR merged to main
- [ ] Vercel auto-deploys (check deployment status)
- [ ] Verify at https://swaryoga.com

---

## 🆘 Common Issues

### "MONGODB_URI not found"
```bash
# Add to .env.local
MONGODB_URI=mongodb+srv://...
```

### "JWT verification failed"
- Ensure JWT_SECRET is set
- Check token format: `Bearer <token>`

### "PayU 403 error"
- Verify PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT
- Check PAYU_MODE matches account type
- Enable DEBUG_PAYU=1 for logs

### "Build fails"
```bash
npm run type-check   # Check TypeScript
npm run lint -- --fix  # Fix linting
npm run build        # Try again
```

See [DEVELOPMENT_WORKFLOW_GUIDE.md](DEVELOPMENT_WORKFLOW_GUIDE.md#troubleshooting) for more.

---

## 📞 Getting Help

1. **Check Documentation**
   - [README_PROJECT.md](README_PROJECT.md) - Overview
   - [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API reference
   - [DATABASE_SCHEMA_DOCUMENTATION.md](DATABASE_SCHEMA_DOCUMENTATION.md) - Database reference

2. **Debug Issue**
   - Check logs: `/api/debug/logs?action=stats`
   - Enable debug mode: `DEBUG_PAYU=1 npm run dev`
   - Run tests: `node test-mongodb.js`

3. **Review Recent Changes**
   - [AUTONOMOUS_IMPROVEMENTS_SUMMARY.md](AUTONOMOUS_IMPROVEMENTS_SUMMARY.md)
   - Last 10 commits: `git log --oneline -10`

4. **Ask Team**
   - Share error messages and steps to reproduce
   - Provide environment information
   - Link to related GitHub issue

---

## 📋 Useful Scripts

```bash
# Development
npm run dev              # Start dev server

# Quality assurance
npm run type-check       # Check types
npm run lint             # Check linting
npm run build            # Test production build

# Testing
node test-mongodb.js     # Test MongoDB
node test-payu-integration.js  # Test PayU

# Database
node diagnose-payu-403.js      # Diagnose PayU issues
DEBUG_PAYU=1 npm run dev       # Debug PayU requests

# Deployment (PM2)
npm run pm2:start        # Start services
npm run pm2:deploy       # Deploy
npm run pm2:restart      # Restart
npm run pm2:logs         # View logs
npm run pm2:delete       # Stop services
```

---

## 🎓 Learning Resources

**For New Team Members:**
1. Start with [README_PROJECT.md](README_PROJECT.md)
2. Read [DEVELOPMENT_WORKFLOW_GUIDE.md](DEVELOPMENT_WORKFLOW_GUIDE.md)
3. Review [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
4. Explore [DATABASE_SCHEMA_DOCUMENTATION.md](DATABASE_SCHEMA_DOCUMENTATION.md)

**External Resources:**
- Next.js: https://nextjs.org/docs
- TypeScript: https://www.typescriptlang.org/docs
- MongoDB: https://docs.mongodb.com/
- Mongoose: https://mongoosejs.com/docs/

---

## 📈 Recent Improvements (Dec 22, 2025)

✅ Rate limiting on auth endpoints  
✅ Standardized error handling  
✅ Request logging & debug endpoint  
✅ Comprehensive API documentation  
✅ Database schema documentation  
✅ Environment configuration guide  
✅ Development workflow guide  
✅ Project README  

See [AUTONOMOUS_IMPROVEMENTS_SUMMARY.md](AUTONOMOUS_IMPROVEMENTS_SUMMARY.md) for details.

---

## 🔗 Quick Links

| Resource | Link |
|----------|------|
| **Production** | https://swaryoga.com |
| **Repository** | https://github.com/globalswaryoga-ai/swaryoga.com-db |
| **Issues** | https://github.com/globalswaryoga-ai/swaryoga.com-db/issues |
| **MongoDB Atlas** | https://cloud.mongodb.com |
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **PayU Dashboard** | https://www.payumoney.com/merchant/dashboard |

---

**Last Updated:** December 22, 2025  
**For Questions:** Check documentation files or ask team  
**Status:** ✅ Production Ready
