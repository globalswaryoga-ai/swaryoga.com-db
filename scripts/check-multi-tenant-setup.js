#!/usr/bin/env node

/**
 * Multi-Tenant Environment Health Check
 * Verifies all multi-tenant infrastructure is properly configured
 * Run: node scripts/check-multi-tenant-setup.js
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const env = {};

// Load .env.local
const envPath = path.join(projectRoot, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  });
}

// Add process.env
Object.assign(env, process.env);

let checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m',
  };
  console.log(`${colors[type] || ''}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(projectRoot, filePath);
  if (fs.existsSync(fullPath)) {
    log(`✅ ${description}`, 'success');
    checks.passed++;
  } else {
    log(`❌ ${description} - NOT FOUND at ${filePath}`, 'error');
    checks.failed++;
  }
}

function checkEnv(key, description) {
  if (env[key]) {
    log(`✅ ${description}`, 'success');
    checks.passed++;
  } else {
    log(
      `⚠️  ${description} - NOT SET (will use defaults)`,
      'warning'
    );
    checks.warnings++;
  }
}

function checkFileContent(filePath, searchString, description) {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    log(`❌ ${description} - FILE NOT FOUND`, 'error');
    checks.failed++;
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  if (content.includes(searchString)) {
    log(`✅ ${description}`, 'success');
    checks.passed++;
  } else {
    log(`❌ ${description} - MISSING CONTENT in ${filePath}`, 'error');
    checks.failed++;
  }
}

// ============================================================================
// Run Checks
// ============================================================================

log('\n🔍 Multi-Tenant Setup Verification\n', 'info');

log('\n📁 Core Files:', 'info');
checkFile('lib/multiTenant/schemas.ts', 'Tenant schemas file');
checkFile('lib/multiTenant/middleware.ts', 'Tenant middleware file');
checkFile('lib/multiTenant/handlers.ts', 'Tenant handlers file');

log('\n📡 API Routes:', 'info');
checkFile('app/api/tenants/route.ts', 'Tenant creation/list endpoint');
checkFile('app/api/tenants/[slug]/route.ts', 'Tenant management endpoint');
checkFile('app/api/tenants/[slug]/api-keys/route.ts', 'API key management endpoint');
checkFile('app/api/tenants/[slug]/api-keys/[keyId]/route.ts', 'API key revocation endpoint');
checkFile('app/api/tenants/[slug]/analytics/route.ts', 'Analytics endpoint');

log('\n📚 Documentation:', 'info');
checkFile('docs/MULTI_TENANT_API_DOCS.ts', 'API documentation');
checkFile('docs/MULTI_TENANT_INTEGRATION_GUIDE.ts', 'Integration guide');
checkFile('docs/MULTI_TENANT_QUICKSTART.md', 'Quick start guide');

log('\n🧪 Testing Scripts:', 'info');
checkFile('scripts/test-multi-tenant.js', 'Multi-tenant test suite');
checkFile('scripts/check-multi-tenant-setup.js', 'Setup verification script');

log('\n⚙️  Environment Variables:', 'info');
checkEnv('MONGODB_URI_MAIN', 'MongoDB main database URI');
checkEnv('MONGODB_CRM_DB_NAME', 'MongoDB CRM database name');
checkEnv('TENANT_APP_DOMAIN', 'Tenant app domain (app.swaryoga.com)');
checkEnv('CRM_SITE_DOMAIN', 'CRM site domain (crm.swaryoga.com)');
checkEnv('WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'WhatsApp webhook verification token');

log('\n🔐 Middleware Configuration:', 'info');
checkFile('middleware.ts', 'Global Next.js middleware');
checkFileContent(
  'middleware.ts',
  'extractTenantSlugEdge',
  'Tenant extraction in edge middleware'
);
checkFileContent(
  'middleware.ts',
  'rateLimitMap',
  'Rate limiting configuration'
);

log('\n📋 Database Models:', 'info');
checkFileContent(
  'lib/multiTenant/schemas.ts',
  'SUBSCRIPTION_TIERS',
  'Subscription tier definitions'
);
checkFileContent(
  'lib/multiTenant/schemas.ts',
  'TenantSchema',
  'Tenant model definition'
);
checkFileContent(
  'lib/multiTenant/schemas.ts',
  'TenantAPIKeySchema',
  'API key model definition'
);
checkFileContent(
  'lib/multiTenant/schemas.ts',
  'hashAPIKey',
  'API key hashing function'
);

log('\n🛡️  Security Checks:', 'info');
checkFileContent(
  'lib/multiTenant/middleware.ts',
  'verifyAPIKey',
  'API key verification logic'
);
checkFileContent(
  'lib/multiTenant/middleware.ts',
  'buildTenantFilter',
  'Tenant data isolation filters'
);
checkFileContent(
  'lib/multiTenant/middleware.ts',
  'withTenantContext',
  'Tenant context middleware wrapper'
);
checkFileContent(
  'lib/multiTenant/handlers.ts',
  'generateAPIKey',
  'API key generation with hashing'
);

log('\n✨ Feature Completeness:', 'info');
checkFileContent(
  'lib/multiTenant/handlers.ts',
  'createTenant',
  'Tenant creation handler'
);
checkFileContent(
  'lib/multiTenant/handlers.ts',
  'upgradePlan',
  'Subscription upgrade handler'
);
checkFileContent(
  'lib/multiTenant/handlers.ts',
  'recordDailyAnalytics',
  'Analytics recording handler'
);
checkFileContent(
  'lib/multiTenant/handlers.ts',
  'setCustomDomain',
  'Custom domain management'
);

// ============================================================================
// Summary
// ============================================================================

log('\n\n📊 Verification Summary\n', 'info');
log(`✅ Passed:   ${checks.passed}`, 'success');
log(`⚠️  Warnings: ${checks.warnings}`, checks.warnings > 0 ? 'warning' : 'info');
log(`❌ Failed:   ${checks.failed}`, checks.failed > 0 ? 'error' : 'success');

const total = checks.passed + checks.warnings + checks.failed;
const percentage = Math.round((checks.passed / total) * 100);
log(`\n📈 Completion: ${percentage}%\n`, percentage >= 95 ? 'success' : 'warning');

if (checks.failed === 0) {
  log('✅ Multi-tenant infrastructure is ready for deployment!\n', 'success');
  process.exit(0);
} else {
  log(
    `\n⚠️  ${checks.failed} critical issues found. Please see above.\n`,
    'error'
  );
  process.exit(1);
}
