/**
 * Admin Login Endpoint Reference Implementation
 * 
 * This shows how the JWT login should work in your Next.js API
 * Reference: /app/api/admin/auth/login/route.ts
 * 
 * This is the BACKEND logic for creating JWT tokens
 */

// ============================================================================
// EXAMPLE: Express/Node.js Version
// ============================================================================

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_EXPIRY = '7d'; // 7 days

/**
 * POST /api/auth/login
 * 
 * Request body:
 * {
 *   "userId": "admincrm",
 *   "password": "password123"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "token": "eyJhbGci...",
 *   "user": {
 *     "userId": "admincrm",
 *     "email": "admin@example.com",
 *     "isAdmin": true,
 *     "role": "admin"
 *   }
 * }
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { userId, password } = req.body;

    // 1. Validate input
    if (!userId || !password) {
      return res.status(400).json({
        error: 'Missing userId or password',
      });
    }

    // 2. Find user in database
    // In real app: const user = await User.findOne({ userId });
    // For this example:
    const user = {
      _id: '507f1f77bcf86cd799439011',
      userId: 'admincrm',
      email: 'admin@swaryoga.com',
      password: '$2a$10$...hashedPasswordHere...', // stored as hash
      isAdmin: true,
      role: 'admin',
      createdAt: new Date(),
    };

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
      });
    }

    // 3. Verify password (using bcrypt)
    // In real app: const isValid = await bcrypt.compare(password, user.password);
    // For demo:
    const isValid = password === 'demo-password'; // DEMO ONLY!

    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid password',
      });
    }

    // 4. Check if user is admin
    if (!user.isAdmin) {
      return res.status(403).json({
        error: 'User is not an admin',
      });
    }

    // 5. Create JWT token
    const token = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        isAdmin: user.isAdmin,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: TOKEN_EXPIRY,
        algorithm: 'HS256',
      }
    );

    // 6. Return token to client
    res.status(200).json({
      success: true,
      token, // Client stores this in localStorage
      user: {
        userId: user.userId,
        email: user.email,
        isAdmin: user.isAdmin,
        role: user.role,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
    });
  }
});

/**
 * Middleware: Verify JWT Token
 * Use this on protected routes
 */
function verifyTokenMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid Authorization header',
      });
    }

    const token = authHeader.slice('Bearer '.length);

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.isAdmin) {
      return res.status(403).json({
        error: 'Admin access required',
      });
    }

    // Attach decoded token to request
    req.user = decoded;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
      });
    }
    return res.status(401).json({
      error: 'Invalid token',
    });
  }
}

/**
 * Example Protected Route
 */
app.get('/api/admin/data', verifyTokenMiddleware, (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'This is protected data',
      user: req.user,
    },
  });
});

// ============================================================================
// FLOW DIAGRAM
// ============================================================================

/*

STEP 1: Client Sends Credentials
┌─────────────────┐
│ Browser/Client  │
└────────┬────────┘
         │
         │ POST /api/auth/login
         │ {
         │   "userId": "admincrm",
         │   "password": "password123"
         │ }
         ↓
┌─────────────────────┐
│ Backend API Server  │
└────────┬────────────┘
         │
         ├─ Check userId exists in database
         ├─ Compare password (bcrypt.compare)
         ├─ Verify isAdmin: true
         │
         ├─ CREATE JWT TOKEN:
         │  jwt.sign(
         │    { userId, email, isAdmin, role },
         │    JWT_SECRET,
         │    { expiresIn: "7d" }
         │  )
         │
         └─ Return: { success: true, token: "eyJ..." }
                        │
                        ↓
         ┌─────────────────────┐
         │ Browser/Client      │
         └────────┬────────────┘
                  │
                  ├─ Save token to localStorage
                  ├─ localStorage['admin_token'] = "eyJ..."
                  │
                  └─ Add to future API calls:
                     Authorization: Bearer eyJ...


STEP 2: Client Uses Token for Protected Routes
┌─────────────────┐
│ Browser/Client  │
└────────┬────────┘
         │
         │ GET /api/admin/conversations
         │ Authorization: Bearer eyJ...
         │
         ↓
┌─────────────────────┐
│ Backend API Server  │
└────────┬────────────┘
         │
         ├─ Extract token from header
         ├─ Verify signature using JWT_SECRET
         ├─ Check not expired
         ├─ Check isAdmin: true
         │
         ├─ ✅ All checks pass
         │
         └─ Return: { success: true, data: {...} }
                        │
                        ↓
         ┌─────────────────────┐
         │ Browser/Client      │
         └─────────────────────┘
            Display messages ✅

*/

// ============================================================================
// CLI USAGE
// ============================================================================

if (require.main === module) {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   JWT Login Implementation Example                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log('This file shows how JWT token creation works in backend.\n');

  console.log('Key Steps in Login Flow:');
  console.log('  1. Client sends userId + password to /api/auth/login');
  console.log('  2. Server verifies credentials in database');
  console.log('  3. Server creates JWT with user info');
  console.log('  4. Server sends JWT back to client');
  console.log('  5. Client stores JWT in localStorage');
  console.log('  6. Client sends JWT in every API request header');
  console.log('  7. Server verifies JWT before returning data\n');

  console.log('Important Constants:');
  console.log(`  JWT_SECRET: ${JWT_SECRET.substring(0, 20)}... (from .env)`);
  console.log(`  TOKEN_EXPIRY: ${TOKEN_EXPIRY} (7 days)`);
  console.log(`  Algorithm: HS256 (HMAC-SHA256)\n`);

  console.log('To use this in your app:');
  console.log('  1. Make sure JWT_SECRET is set in .env');
  console.log('  2. Implement similar logic in /app/api/admin/auth/login/route.ts');
  console.log('  3. Use verifyTokenMiddleware on protected routes\n');
}

module.exports = {
  verifyTokenMiddleware,
};
