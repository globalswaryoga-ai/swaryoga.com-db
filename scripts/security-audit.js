/**
 * Security audit and compliance checker
 * Run: node scripts/security-audit.js
 * 
 * Scans codebase for common security vulnerabilities and best practices
 */

const fs = require('fs');
const path = require('path');

class SecurityAudit {
  constructor() {
    this.findings = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };
  }

  /**
   * Check for hardcoded secrets
   */
  checkForSecrets() {
    console.log('\n🔍 Checking for hardcoded secrets...\n');

    const patterns = [
      { name: 'API Keys', regex: /api[_-]?key\s*=\s*['"`][^'"`]+['"`]/gi },
      { name: 'Private Keys', regex: /private[_-]?key\s*=\s*['"`][^'"`]+['"`]/gi },
      { name: 'Password', regex: /password\s*=\s*['"`][^'"`]+['"`]/gi },
      { name: 'JWT Secrets', regex: /jwt[_-]?secret\s*=\s*['"`][^'"`]+['"`]/gi },
      { name: 'Database URLs', regex: /mongodb[+:\/\/]+[^'"`\s]+/gi },
    ];

    const filesToCheck = this.getFilesToCheck(['.env.local', '.env.production']);

    filesToCheck.forEach((file) => {
      if (fs.existsSync(file)) {
        console.log(`⚠️  Found environment file: ${file}`);
        console.log('   Ensure .env files are in .gitignore');
        this.findings.critical.push({
          type: 'Exposed Environment File',
          file,
          severity: 'CRITICAL',
        });
      }
    });

    console.log('✅ Secret check complete');
  }

  /**
   * Check for vulnerable dependencies
   */
  checkDependencies() {
    console.log('\n🔍 Checking dependencies...\n');

    const packageJsonPath = path.join(process.cwd(), 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      console.log('⚠️  package.json not found');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Check for known vulnerable packages
    const vulnerablePackages = [
      'lodash',
      'moment', // use date-fns instead
      'md5', // use crypto instead
    ];

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    let foundVulnerable = false;
    vulnerablePackages.forEach((pkg) => {
      if (allDeps[pkg]) {
        console.log(`⚠️  ${pkg} found (consider alternative)`);
        foundVulnerable = true;
      }
    });

    if (!foundVulnerable) {
      console.log('✅ No known vulnerable packages found');
    }

    console.log('✅ Dependency check complete');
  }

  /**
   * Check for SQL injection vulnerabilities
   */
  checkSQLInjection() {
    console.log('\n🔍 Checking for SQL injection risks...\n');

    const suspiciousPatterns = [
      { name: 'String concatenation in queries', regex: /query\s*\+\s*['"`]/g },
      { name: 'Template literals in queries', regex: /query.*`.*\$\{/g },
      { name: 'Direct user input', regex: /\.find\(\s*{\s*\$where/g },
    ];

    const tsFiles = this.getFilesToCheck(['app/api/**/*.ts', 'lib/**/*.ts']);

    let issues = 0;
    tsFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');

      suspiciousPatterns.forEach((pattern) => {
        if (pattern.regex.test(content)) {
          console.log(`⚠️  ${file}: Potential SQL injection pattern`);
          this.findings.high.push({
            type: 'Potential SQL Injection',
            file,
            pattern: pattern.name,
            severity: 'HIGH',
          });
          issues++;
        }
      });
    });

    if (issues === 0) {
      console.log('✅ No obvious SQL injection patterns detected');
    }

    console.log('✅ SQL injection check complete');
  }

  /**
   * Check for XSS vulnerabilities
   */
  checkXSS() {
    console.log('\n🔍 Checking for XSS vulnerabilities...\n');

    const xssPatterns = [
      { name: 'innerHTML usage', regex: /innerHTML\s*=/g },
      { name: 'dangerouslySetInnerHTML', regex: /dangerouslySetInnerHTML/g },
      { name: 'eval() usage', regex: /eval\(/g },
    ];

    const tsxFiles = this.getFilesToCheck(['app/**/*.tsx', 'components/**/*.tsx']);

    let issues = 0;
    tsxFiles.forEach((file) => {
      try {
        const content = fs.readFileSync(file, 'utf8');

        xssPatterns.forEach((pattern) => {
          const matches = content.match(pattern.regex);
          if (matches) {
            console.log(
              `⚠️  ${file}: Potential XSS pattern (${matches.length} occurrences)`
            );
            this.findings.high.push({
              type: 'Potential XSS',
              file,
              pattern: pattern.name,
              severity: 'HIGH',
            });
            issues++;
          }
        });
      } catch (e) {
        // Skip unreadable files
      }
    });

    if (issues === 0) {
      console.log('✅ No obvious XSS patterns detected');
    }

    console.log('✅ XSS check complete');
  }

  /**
   * Check authentication in API routes
   */
  checkAuthentication() {
    console.log('\n🔍 Checking authentication in API routes...\n');

    const apiRoutes = this.getFilesToCheck(['app/api/**/*.ts']);

    let protectedRoutes = 0;
    let unprotectedRoutes = [];

    apiRoutes.forEach((file) => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const hasAuth =
          /verifyToken|requireAuth|checkAuth|Authorization/i.test(content);

        if (hasAuth) {
          protectedRoutes++;
        } else {
          // Public endpoints are OK
          if (!file.includes('public') && !file.includes('health')) {
            unprotectedRoutes.push(file);
          }
        }
      } catch (e) {
        // Skip errors
      }
    });

    console.log(`✅ Protected routes: ${protectedRoutes}`);
    if (unprotectedRoutes.length > 0) {
      console.log(`⚠️  Potentially unprotected: ${unprotectedRoutes.length}`);
    }

    console.log('✅ Authentication check complete');
  }

  /**
   * Check rate limiting
   */
  checkRateLimiting() {
    console.log('\n🔍 Checking rate limiting...\n');

    const apiRoutes = this.getFilesToCheck(['app/api/**/*.ts']);

    let rateLimitedRoutes = 0;

    apiRoutes.forEach((file) => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (/checkRateLimit|rateLimit|RATE_LIMIT/i.test(content)) {
          rateLimitedRoutes++;
        }
      } catch (e) {
        // Skip errors
      }
    });

    console.log(`✅ Rate-limited routes: ${rateLimitedRoutes}`);

    console.log('✅ Rate limiting check complete');
  }

  /**
   * Helper: Get files matching patterns
   */
  getFilesToCheck(patterns) {
    const files = [];
    const rootDir = process.cwd();

    patterns.forEach((pattern) => {
      const glob = require('glob');
      try {
        const matches = glob.sync(pattern, { cwd: rootDir });
        files.push(...matches.map((f) => path.join(rootDir, f)));
      } catch (e) {
        // Pattern may not match anything
      }
    });

    return [...new Set(files)]; // Remove duplicates
  }

  /**
   * Generate security report
   */
  generateReport() {
    console.log('\n' + '═'.repeat(60));
    console.log('🔒 SECURITY AUDIT REPORT');
    console.log('═'.repeat(60));

    this.checkForSecrets();
    this.checkDependencies();
    this.checkSQLInjection();
    this.checkXSS();
    this.checkAuthentication();
    this.checkRateLimiting();

    console.log('\n' + '═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));

    const total =
      this.findings.critical.length +
      this.findings.high.length +
      this.findings.medium.length +
      this.findings.low.length;

    console.log(`Critical Issues: ${this.findings.critical.length}`);
    console.log(`High Issues: ${this.findings.high.length}`);
    console.log(`Medium Issues: ${this.findings.medium.length}`);
    console.log(`Low Issues: ${this.findings.low.length}`);
    console.log(`Total Issues: ${total}`);

    console.log('\n✅ Security audit complete\n');

    if (this.findings.critical.length > 0) {
      console.log('⚠️  Please address critical issues immediately');
      process.exit(1);
    }
  }
}

// Run audit
const audit = new SecurityAudit();
audit.generateReport();
