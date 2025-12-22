# Swar Yoga Development Workflow Guide

**Last Updated:** December 22, 2025  
**For:** Development Team

---

## Quick Start for Developers

### Initial Setup

```bash
# Clone repository
git clone https://github.com/globalswaryoga-ai/swaryoga.com-db.git
cd swaryoga.com-db

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your local MongoDB and test PayU credentials

# Run development server
npm run dev

# App runs at http://localhost:3000
```

### Daily Development Workflow

```bash
# Start dev server (auto-reload on file changes)
npm run dev

# In another terminal, run type checking
npm run type-check

# Run linter (ESLint)
npm run lint

# Before committing, build locally
npm run build

# Run tests (if available)
npm test
```

---

## Project Structure

```
swar-yoga-web-mohan/
├── app/                          # Next.js App Router
│   ├── api/                       # API routes
│   │   ├── auth/                  # Authentication endpoints
│   │   ├── accounting/            # Accounting/budget endpoints
│   │   ├── workshops/             # Workshop endpoints
│   │   ├── payments/              # Payment endpoints
│   │   └── debug/                 # Debug endpoints
│   ├── (public pages)             # Public pages
│   └── layout.tsx                 # Root layout
│
├── lib/                           # Utilities and helpers
│   ├── db.ts                      # Database connection & models
│   ├── auth.ts                    # JWT utilities
│   ├── api-error.ts               # Error handling utilities
│   ├── rate-limit.ts              # Rate limiting middleware
│   ├── logging.ts                 # Request logging utilities
│   └── payments/                  # Payment-specific utilities
│
├── components/                    # Reusable React components
│   ├── life-planner/              # Life planner components
│   ├── ui/                        # Base UI components
│   └── ...
│
├── public/                        # Static assets
├── styles/                        # Global styles
├── package.json                   # Dependencies
├── next.config.js                 # Next.js configuration
├── tsconfig.json                  # TypeScript configuration
├── eslint.config.js               # ESLint rules
├── ecosystem.config.js            # PM2 configuration
│
└── Documentation Files
    ├── API_DOCUMENTATION.md       # API endpoints reference
    ├── DATABASE_SCHEMA_DOCUMENTATION.md
    ├── ENV_CONFIGURATION_GUIDE.md
    └── DEVELOPMENT_WORKFLOW_GUIDE.md (this file)
```

---

## Code Style & Standards

### TypeScript

- **Enable strict mode:** All files use `strict: true` in `tsconfig.json`
- **Type everything:** Use types for function parameters and return values
- **Interfaces for contracts:** Use `interface` for external contracts, `type` for internal unions

Example:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function fetchData(): Promise<ApiResponse<User[]>> {
  // Implementation
}
```

### Error Handling

Use the standardized error utility from `lib/api-error.ts`:

```typescript
import { apiError, apiSuccess } from '@/lib/api-error';

// Error response
return apiError('VALIDATION_ERROR', 'Email is required');

// Success response
return apiSuccess({ message: 'Success', data: user });
```

### Database Operations

- Always use `.lean()` on read queries for performance
- Use `.select()` to limit returned fields when applicable
- Add `.limit()` to prevent returning too much data

```typescript
// Good ✅
const users = await User.find({ active: true })
  .select('name email phone')
  .lean()
  .limit(100);

// Avoid ❌
const users = await User.find({ active: true });
```

### API Endpoints

Structure all endpoints consistently:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Model } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    // 1. Validate authentication if needed
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return apiError('UNAUTHORIZED', 'Token required');
    }

    // 2. Connect to database
    await connectDB();

    // 3. Fetch data with validation
    const data = await Model.find({ userId: decoded.userId }).lean();

    // 4. Return success
    return apiSuccess(data);
  } catch (error) {
    // 5. Handle errors
    console.error('Error:', error);
    return apiError('SERVER_ERROR');
  }
}
```

### Logging

Use the logging utility for request/response tracking:

```typescript
import { 
  createRequestContext, 
  logRequest, 
  logResponse, 
  logApiError,
  Timer 
} from '@/lib/logging';

export async function POST(request: NextRequest) {
  const timer = new Timer();
  const context = createRequestContext(request);
  
  logRequest(context, 'Login attempt started');
  
  try {
    // Your code here
    
    logResponse(context, 200, timer.elapsed(), 'Login successful');
    return apiSuccess(data);
  } catch (error) {
    logApiError(context, error, 500);
    return apiError('SERVER_ERROR');
  }
}
```

---

## Development Commands

### Running & Building

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Start production server (requires build first)
npm start

# Watch mode for type checking
npm run type-check -- --watch
```

### Code Quality

```bash
# Type checking
npm run type-check

# Linting (ESLint)
npm run lint

# Fix fixable lint issues
npm run lint -- --fix

# Format code (if Prettier installed)
npm run format
```

### Database

```bash
# Test MongoDB connection
node test-mongodb.js

# Test PayU integration
node test-payu-integration.js

# Debug PayU issues
DEBUG_PAYU=1 node debug-payu-advanced.js
```

### Deployment

```bash
# Self-hosted with PM2
npm run pm2:start      # Start PM2 daemon
npm run pm2:deploy     # Deploy with PM2
npm run pm2:restart    # Restart services
npm run pm2:logs       # View logs
npm run pm2:delete     # Stop services

# Automated deployment
./auto-deploy.sh       # Auto-deploy to production
```

---

## Common Development Tasks

### Adding a New API Endpoint

1. **Create file:** `app/api/[resource]/route.ts`
2. **Import utilities:**
   ```typescript
   import { connectDB } from '@/lib/db';
   import { apiError, apiSuccess } from '@/lib/api-error';
   import { verifyToken } from '@/lib/auth';
   ```
3. **Export handler:** `export async function GET/POST/PUT/DELETE(request: NextRequest)`
4. **Implement logic:** Connect DB, validate auth, process data
5. **Test:** Use curl or Postman with proper headers
6. **Update docs:** Add to `API_DOCUMENTATION.md`

### Adding a Database Model

1. **Edit** `lib/db.ts`
2. **Define schema** with proper types and validation
3. **Export model:** `export const ModelName = mongoose.models.X || mongoose.model('X', schema)`
4. **Create indexes** for frequently queried fields
5. **Update docs:** Add to `DATABASE_SCHEMA_DOCUMENTATION.md`

Example:
```typescript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, index: true },
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
```

### Protecting an Endpoint

```typescript
// 1. Import utilities
import { verifyToken } from '@/lib/auth';

// 2. Extract and verify token
export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.split(' ')[1];
  const decoded = verifyToken(token);
  
  // 3. Check authentication
  if (!decoded?.userId) {
    return apiError('UNAUTHORIZED', 'Valid token required');
  }
  
  // Endpoint is now protected
  return apiSuccess({ data: 'Protected data' });
}
```

### Adding Rate Limiting

```typescript
import { checkRateLimit, getClientId } from '@/lib/rate-limit';

const RATE_LIMIT = {
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 10,
};

export async function POST(request: NextRequest) {
  const clientId = getClientId(request.headers);
  const check = checkRateLimit(clientId, RATE_LIMIT);
  
  if (!check.allowed) {
    const retryAfter = Math.ceil((check.resetTime - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { 
        status: 429,
        headers: { 'Retry-After': retryAfter.toString() }
      }
    );
  }
  
  // Process request
}
```

---

## Testing Guidelines

### Manual API Testing

```bash
# Test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Test protected endpoint with token
curl -X GET http://localhost:3000/api/accounting/budget \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Postman

1. Import API collection (if available)
2. Set environment variables
3. Use pre-request scripts for tokens
4. Verify status codes and response format

### Browser DevTools

1. Open Network tab
2. Monitor all API requests
3. Check response payloads
4. Verify authentication headers

---

## Git Workflow

### Branching Strategy

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit with meaningful messages
git add .
git commit -m "feat: add new feature"
git commit -m "fix: resolve issue"
git commit -m "docs: update documentation"
git commit -m "refactor: improve code quality"

# Push to remote
git push origin feature/your-feature-name

# Create Pull Request on GitHub
# Request review, address feedback

# Merge to main
git checkout main
git pull origin main
git merge --squash feature/your-feature-name
git push origin main

# Delete branch
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

### Commit Message Convention

```
<type>: <subject>

<body>

Fixes #<issue-number>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Test additions
- `chore`: Build, CI, dependency updates

Example:
```
feat: add rate limiting to auth endpoints

Implement in-memory rate limiting for login and signup
endpoints to prevent brute force attacks.

- 10 attempts per minute for login
- 5 attempts per 10 minutes for signup
- Returns 429 with Retry-After header

Fixes #142
```

---

## Debugging

### Enable Debug Logging

```bash
# PayU debugging
DEBUG_PAYU=1 npm run dev

# MongoDB debugging
DEBUG_MONGODB=1 npm run dev

# Both
DEBUG_PAYU=1 DEBUG_MONGODB=1 npm run dev
```

### View Request Logs

```bash
# Get recent logs
curl 'http://localhost:3000/api/debug/logs?action=logs&limit=50'

# Get stats
curl 'http://localhost:3000/api/debug/logs?action=stats'

# Get user-specific logs
curl 'http://localhost:3000/api/debug/logs?action=user-logs&userId=USER_ID'

# Get request-specific logs
curl 'http://localhost:3000/api/debug/logs?action=request-logs&requestId=REQ_ID'
```

### VS Code Debugging

1. Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/next",
      "args": ["dev"],
      "console": "integratedTerminal"
    }
  ]
}
```

2. Set breakpoints and press F5

---

## Performance Optimization

### Database Queries

- ✅ Use `.lean()` for read-only operations
- ✅ Use `.select()` to limit fields
- ✅ Use `.limit()` to limit results
- ✅ Create indexes for frequently queried fields
- ❌ Avoid N+1 queries
- ❌ Don't return entire documents unless needed

### API Response Size

- ✅ Limit array results (100 max)
- ✅ Use pagination for large datasets
- ✅ Compress response with gzip
- ✅ Use appropriate status codes
- ❌ Don't return unnecessary fields

### Caching

- ✅ Cache static assets (CSS, JS, images)
- ✅ Use browser caching headers
- ✅ Implement API response caching (optional)
- ❌ Don't cache sensitive user data

---

## Security Checklist

- [ ] All API inputs validated
- [ ] SQL injection prevented (Mongoose is safe)
- [ ] XSS prevented (Next.js does this by default)
- [ ] CSRF tokens used for state-changing requests
- [ ] Passwords hashed with bcrypt
- [ ] JWTs signed and verified
- [ ] Rate limiting implemented
- [ ] No sensitive data in logs
- [ ] HTTPS enforced in production
- [ ] CORS configured correctly

---

## Troubleshooting

### "Cannot find module 'X'"

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "MongoDB connection failed"

1. Check `.env.local` has correct URI
2. Verify IP whitelist in MongoDB Atlas
3. Test connection: `node test-mongodb.js`

### "Type errors in development"

```bash
npm run type-check
# Fix reported errors
```

### "Build fails but dev server works"

```bash
npm run build
# Read error messages carefully
npm run lint -- --fix
npm run build
```

---

## Resources

- **Next.js Docs:** https://nextjs.org/docs
- **MongoDB Docs:** https://docs.mongodb.com/
- **Mongoose Docs:** https://mongoosejs.com/docs/
- **TypeScript Docs:** https://www.typescriptlang.org/docs/
- **JWT Docs:** https://jwt.io/introduction
- **PayU Docs:** https://www.payumoney.com/

---

## Support & Questions

- Check existing documentation files
- Review recent commits for examples
- Ask team members on Slack
- Refer to API documentation
- Check debug logs for issues

---

**Last Updated:** December 22, 2025  
**Maintained By:** Swar Yoga Engineering Team
