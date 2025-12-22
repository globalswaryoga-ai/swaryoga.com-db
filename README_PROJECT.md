# Swar Yoga Web Platform

**Version:** 1.0.0  
**Status:** Production Ready ✅  
**Last Updated:** December 22, 2025

---

## 🎯 Overview

Swar Yoga is a comprehensive web platform for yoga instruction, workshop management, and personal finance planning. It combines:

- **Workshop Management**: Schedule and manage yoga workshops online and offline
- **Payment Integration**: Seamless PayU integration for workshop registration
- **Personal Finance**: Life planner with budget tracking and financial accounts
- **User Authentication**: Secure JWT-based authentication with rate limiting
- **Admin Dashboard**: CRM dashboard for managing workshops and users

---

## 🚀 Quick Start

### For Users

Visit https://swaryoga.com to:
1. Create an account
2. Browse available workshops
3. Register for workshops with payment
4. Manage personal finances with the life planner

### For Developers

```bash
# Clone repository
git clone https://github.com/globalswaryoga-ai/swaryoga.com-db.git
cd swaryoga.com-db

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Start development server
npm run dev

# Application runs at http://localhost:3000
```

See [DEVELOPMENT_WORKFLOW_GUIDE.md](DEVELOPMENT_WORKFLOW_GUIDE.md) for detailed setup instructions.

---

## 📚 Documentation

### For Developers

- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Complete API reference with examples
- **[DATABASE_SCHEMA_DOCUMENTATION.md](DATABASE_SCHEMA_DOCUMENTATION.md)** - Database models and relationships
- **[ENV_CONFIGURATION_GUIDE.md](ENV_CONFIGURATION_GUIDE.md)** - Environment variable setup
- **[DEVELOPMENT_WORKFLOW_GUIDE.md](DEVELOPMENT_WORKFLOW_GUIDE.md)** - Development best practices and workflow

### For DevOps/Operations

- **[ecosystem.config.js](ecosystem.config.js)** - PM2 configuration for self-hosting
- **[auto-deploy.sh](auto-deploy.sh)** - Automated deployment script
- **Deployment**: Currently on Vercel (https://swaryoga.com)

### For Product/Business

- Website: https://swaryoga.com
- Features: Workshops, Payments, Life Planning, CRM Dashboard

---

## 🏗️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Hooks** - State management
- **Lucide Icons** - Icon library

### Backend
- **Next.js API Routes** - Serverless endpoints
- **Node.js** - JavaScript runtime
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB

### Infrastructure
- **Vercel** - Production deployment (https://swaryoga.com)
- **MongoDB Atlas** - Cloud database
- **PayU** - Payment gateway
- **JWT** - Authentication tokens

### Security
- **bcryptjs** - Password hashing
- **JWT** - Token-based auth
- **Rate Limiting** - Brute force protection
- **Input Validation** - Data integrity

---

## 🔑 Key Features

### Authentication & Security
- User signup and login with email/password
- JWT-based authentication (7-day token expiry)
- Rate limiting: 10 login attempts/min, 5 signup attempts/10min
- Password hashing with bcryptjs
- Secure token verification

### Workshop Management
- Create and manage workshop schedules
- Multiple modes: online, offline
- Multiple languages supported
- Real-time seat inventory tracking
- Published/unpublished status control

### Payment Processing
- PayU integration for workshop registration
- Platform fee calculation (3.3% surcharge)
- Transaction tracking and verification
- Order management and seat allocation
- Webhook support for payment callbacks

### Personal Finance
- Budget planning with yearly targets
- Income and expense tracking
- Account management (bank, cash, investment, loan)
- Budget allocation by category
- Transaction history and analytics

### Admin Dashboard
- Workshop management interface
- User management
- Payment tracking and reconciliation
- Order management
- CRM functionality

---

## 📖 API Overview

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### Accounting
- `GET /api/accounting/budget` - Get user budget
- `GET /api/accounting/accounts` - List user accounts
- `POST /api/accounting/accounts` - Create new account
- `GET /api/accounting/transactions` - Get transactions

### Workshops
- `GET /api/workshops/schedules` - Get published schedules

### Payments
- `POST /api/payments/payu/initiate` - Initiate payment
- `POST /api/payments/payu/callback` - Payment callback

### Debug (Development)
- `GET /api/debug/env-check` - Environment verification
- `GET /api/debug/connection` - Database connection test
- `GET /api/debug/logs` - Request logging and monitoring

Full API documentation: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

## 🗄️ Database Schema

### Core Models
- **User** - User accounts and profiles
- **Budget** - Budget plans and allocations
- **Account** - Financial accounts
- **Transaction** - Income/expense transactions

### Workshop Models
- **Workshop** - Workshop definitions
- **WorkshopSchedule** - Workshop sessions
- **Order** - Workshop registrations

### Audit Models
- **Signin** - Login audit trail

Full schema documentation: [DATABASE_SCHEMA_DOCUMENTATION.md](DATABASE_SCHEMA_DOCUMENTATION.md)

---

## ⚙️ Configuration

### Required Environment Variables
```bash
MONGODB_URI=              # MongoDB connection string
JWT_SECRET=               # JWT signing secret
PAYU_MERCHANT_KEY=        # PayU merchant key
PAYU_MERCHANT_SALT=       # PayU merchant salt
PAYU_MODE=production      # PayU mode: production or development
```

### Optional Environment Variables
```bash
NODE_ENV=production       # Node environment
LOG_LEVEL=info            # Logging level
DEBUG_PAYU=1              # Enable PayU debugging
```

See [ENV_CONFIGURATION_GUIDE.md](ENV_CONFIGURATION_GUIDE.md) for detailed setup.

---

## 🧪 Testing & Verification

### Development Commands
```bash
# Development server
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Database connection test
node test-mongodb.js

# PayU integration test
node test-payu-integration.js
```

### Health Checks
```bash
# Environment check
curl https://swaryoga.com/api/debug/env-check

# Database connection
curl https://swaryoga.com/api/debug/connection

# Request logs
curl 'https://swaryoga.com/api/debug/logs?action=stats'
```

---

## 🚢 Deployment

### Vercel (Current Production)
- Automatic deployment on git push to `main`
- Environment variables configured in Vercel dashboard
- Zero-downtime deployments

### Self-Hosted with PM2
```bash
# Start services
npm run pm2:start

# Deploy
npm run pm2:deploy

# Restart services
npm run pm2:restart

# View logs
npm run pm2:logs
```

### Automated Deployment
```bash
# Deploy script
./auto-deploy.sh
```

---

## 📊 Performance

### Build Metrics
- 147 static/dynamic pages
- First Load JS: 88.3 kB (shared by all pages)
- Total build size: ~500 MB (with dependencies)

### Database Optimization
- All read queries use `.lean()` for performance
- Proper indexing on frequently queried fields
- Connection pooling with MongoDB Atlas
- Rate limiting to prevent abuse

### API Performance
- Average response time: < 200ms
- Rate limiting prevents brute force
- Gzip compression enabled
- Caching headers configured

---

## 🔐 Security

### Authentication
- JWT tokens with 7-day expiry
- Password hashing with bcryptjs (10 salt rounds)
- Secure token verification on protected endpoints

### Rate Limiting
- Login: 10 attempts/minute per IP
- Signup: 5 attempts/10 minutes per IP
- Returns 429 status with Retry-After header

### Input Validation
- Email format validation with regex
- Age range validation (13-150)
- Required field validation
- MongoDB injection prevention (via Mongoose)

### Logging & Monitoring
- Request/response logging with correlation IDs
- Error tracking with context
- Login audit trail
- Debug endpoints for diagnostics

---

## 🐛 Debugging

### Enable Debug Logging
```bash
# PayU debug
DEBUG_PAYU=1 npm run dev

# MongoDB debug
DEBUG_MONGODB=1 npm run dev
```

### View Logs
```bash
# Recent logs
curl 'http://localhost:3000/api/debug/logs?action=logs'

# Statistics
curl 'http://localhost:3000/api/debug/logs?action=stats'

# User logs
curl 'http://localhost:3000/api/debug/logs?action=user-logs&userId=USER_ID'
```

---

## 📋 Project Structure

```
swar-yoga-web-mohan/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   ├── (pages)                   # Public pages
│   └── layout.tsx                # Root layout
├── lib/                          # Utilities
│   ├── db.ts                     # Database connection & models
│   ├── auth.ts                   # JWT utilities
│   ├── api-error.ts              # Error handling
│   ├── rate-limit.ts             # Rate limiting
│   ├── logging.ts                # Request logging
│   └── payments/                 # Payment utilities
├── components/                   # React components
├── public/                       # Static assets
├── styles/                       # Global styles
├── package.json                  # Dependencies
├── next.config.js                # Next.js config
├── tsconfig.json                 # TypeScript config
├── ecosystem.config.js           # PM2 config
└── [documentation files]
```

---

## 📦 Dependencies

### Core
- **next** 14.2.35
- **react** 19
- **typescript** 5.3+
- **mongoose** 6.x

### Authentication
- **jsonwebtoken** - JWT signing/verification
- **bcryptjs** - Password hashing

### Styling
- **tailwindcss** - CSS utility framework
- **lucide-react** - Icon library

### Utilities
- **axios** - HTTP client
- **date-fns** - Date utilities
- **lodash** - Utility library

See `package.json` for complete list and versions.

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes following code standards
3. Commit with meaningful messages: `git commit -m "feat: add feature"`
4. Push to remote: `git push origin feature/your-feature`
5. Create Pull Request on GitHub
6. Address review feedback
7. Merge to main after approval

See [DEVELOPMENT_WORKFLOW_GUIDE.md](DEVELOPMENT_WORKFLOW_GUIDE.md) for detailed workflow.

---

## 📝 Git Commit Convention

```
<type>: <subject>

<optional body>

Fixes #<issue-number>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `security` - Security fix
- `chore` - Build/CI/dependency updates

---

## 🆘 Troubleshooting

### "Cannot connect to MongoDB"
1. Check `.env.local` has correct URI
2. Verify IP whitelist in MongoDB Atlas
3. Run `node test-mongodb.js`

### "JWT verification failed"
1. Ensure JWT_SECRET is set
2. Verify token hasn't expired (7 days)
3. Check token format: `Bearer <token>`

### "PayU 403 Forbidden"
1. Verify merchant credentials
2. Check PAYU_MODE matches account type
3. Check IP whitelist in PayU settings
4. Enable DEBUG_PAYU=1 for details

### "Build fails locally"
1. Clear node_modules: `rm -rf node_modules && npm install`
2. Check TypeScript errors: `npm run type-check`
3. Fix linting errors: `npm run lint -- --fix`

---

## 📞 Support

### For Users
- Website: https://swaryoga.com
- Contact form on website
- Email: support@swaryoga.com

### For Developers
- Read documentation files in this repository
- Check recent commits for examples
- Review API documentation
- Check debug endpoints for diagnostics

### For Bugs
- Create GitHub issue with details
- Include error messages and steps to reproduce
- Provide environment information

---

## 📄 License

© 2025 Swar Yoga. All rights reserved.

This code is protected under intellectual property laws and confidentiality agreements.

---

## 🎉 Recent Improvements (Dec 22, 2025)

✅ **Comprehensive API Documentation** - Complete endpoint reference  
✅ **Database Schema Documentation** - All models documented  
✅ **Request Logging & Monitoring** - Structured logging with debug endpoints  
✅ **Rate Limiting** - Brute force protection on auth endpoints  
✅ **Error Standardization** - Consistent error responses across APIs  
✅ **Environment Configuration Guide** - Setup documentation  
✅ **Development Workflow Guide** - Best practices and standards  
✅ **Code Security** - Security headers and protection  
✅ **Database Optimization** - `.lean()` queries for performance  
✅ **Type Safety** - Full TypeScript strict mode  

---

## 📈 Metrics

- **Pages:** 147 static/dynamic
- **API Endpoints:** 20+
- **Database Models:** 8+
- **Build Time:** ~60-90 seconds
- **Production Uptime:** 99.9%+
- **Average Response Time:** < 200ms

---

**Last Updated:** December 22, 2025  
**Maintained By:** Swar Yoga Engineering Team  
**Status:** Production Ready ✅
