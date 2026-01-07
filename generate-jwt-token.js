/**
 * Admin JWT Token Generator
 * 
 * This script generates a valid JWT token for testing
 * Use this to create a token when needed for API testing
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Get JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

/**
 * Generate Admin JWT Token
 * 
 * @param {Object} user - User data
 * @param {string} user.userId - Admin user ID (e.g., 'admincrm')
 * @param {string} user.email - Admin email
 * @param {boolean} user.isAdmin - Must be true for admin APIs
 * @param {string} user.role - User role (e.g., 'admin')
 * @param {string} expiresIn - Token expiration (default: '7d')
 * @returns {string} JWT token
 */
function generateAdminToken(user, expiresIn = '7d') {
  if (!user.userId) {
    throw new Error('userId is required');
  }

  if (!user.isAdmin) {
    throw new Error('isAdmin must be true for admin tokens');
  }

  const payload = {
    userId: user.userId,
    email: user.email || '',
    isAdmin: user.isAdmin,
    role: user.role || 'admin',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
    algorithm: 'HS256',
  });
}

/**
 * Verify JWT Token
 * 
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token signature');
    }
    throw error;
  }
}

/**
 * Decode JWT Token (without verification)
 * Use this to see token contents without verifying signature
 * 
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
function decodeToken(token) {
  return jwt.decode(token);
}

// ============================================================================
// CLI: Generate token for testing
// ============================================================================

if (require.main === module) {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   JWT Token Generator for Swar Yoga CRM                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Admin user credentials
  const adminUser = {
    userId: 'admincrm',
    email: 'admin@swaryoga.com',
    isAdmin: true,
    role: 'admin',
  };

  try {
    // Generate token
    console.log('📝 Generating token for:', adminUser.userId);
    const token = generateAdminToken(adminUser, '7d');

    console.log('\n✅ Token generated successfully!\n');
    console.log('━'.repeat(60));
    console.log('TOKEN (copy this for Authorization header):');
    console.log('━'.repeat(60));
    console.log(token);
    console.log('━'.repeat(60) + '\n');

    // Decode to show contents
    const decoded = decodeToken(token);
    console.log('📋 Token Contents:');
    console.log(JSON.stringify(decoded, null, 2));

    // Verify token
    console.log('\n✅ Verification:');
    const verified = verifyToken(token);
    console.log('✅ Signature valid');
    console.log('✅ Not expired');
    console.log('✅ isAdmin:', verified.isAdmin);

    // Usage instructions
    console.log('\n📌 How to Use This Token:\n');
    console.log('1. Copy the token above');
    console.log('2. In browser DevTools Console, paste:');
    console.log(`   localStorage.setItem('admin_token', '${token}')`);
    console.log('3. Reload page');
    console.log('4. Or use in API calls with header:');
    console.log(`   Authorization: Bearer ${token.substring(0, 30)}...`);

    console.log('\n⏰ Token Expiration:');
    const expiresAt = new Date(decoded.exp * 1000);
    console.log(`   Expires: ${expiresAt.toLocaleString()}`);
    const daysLeft = Math.ceil((decoded.exp - Math.floor(Date.now() / 1000)) / 86400);
    console.log(`   Valid for: ${daysLeft} days\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  generateAdminToken,
  verifyToken,
  decodeToken,
};
