#!/usr/bin/env node

/**
 * DIAGNOSTIC: React Error #418 and #423
 * 
 * Error #418: Missing dependency in useCallback/useMemo
 * Error #423: Cannot use setState in async component without Suspense
 * 
 * This diagnostic checks for common causes
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║   React Error Diagnostic                           ║');
console.log('╚════════════════════════════════════════════════════╝\n');

// Check 1: Look for useCallback/useMemo without proper dependencies
console.log('CHECK 1: useCallback/useMemo dependency issues\n');

const findFiles = (dir, ext) => {
  let files = [];
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !item.startsWith('.')) {
      files = files.concat(findFiles(fullPath, ext));
    } else if (item.endsWith(ext)) {
      files.push(fullPath);
    }
  });
  return files;
};

const tsxFiles = findFiles(path.join(__dirname, 'app/admin/crm'), '.tsx');
console.log(`Found ${tsxFiles.length} .tsx files in admin/crm\n`);

let issues = [];

tsxFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, i) => {
    if (line.includes('useCallback') || line.includes('useMemo')) {
      // Find the closing bracket and dependency array
      let j = i;
      let dependencyArray = null;
      while (j < Math.min(i + 30, lines.length)) {
        if (lines[j].includes('}, [')) {
          // Extract dependency array
          const match = lines[j].match(/\}, \[(.*?)\]/);
          if (match) {
            dependencyArray = match[1];
            break;
          }
        }
        j++;
      }
      
      if (!dependencyArray) {
        const relativePath = path.relative(__dirname, file);
        issues.push({
          file: relativePath,
          line: i + 1,
          type: line.includes('useCallback') ? 'useCallback' : 'useMemo',
          dependencies: 'MISSING?',
        });
      }
    }
  });
});

if (issues.length > 0) {
  console.log('⚠️  Found potential dependency issues:');
  issues.forEach(issue => {
    console.log(`  ${issue.file}:${issue.line}`);
    console.log(`    Type: ${issue.type}`);
    console.log(`    Dependencies: ${issue.dependencies}\n`);
  });
} else {
  console.log('✅ No obvious dependency issues found\n');
}

// Check 2: Look for async/await in components
console.log('\nCHECK 2: Async component patterns\n');

let asyncIssues = [];
tsxFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, i) => {
    if (line.includes('async ') && (line.includes('function ') || line.includes('const '))) {
      if (!line.includes('// ') && !line.includes('useCallback') && !line.includes('useEffect')) {
        const relativePath = path.relative(__dirname, file);
        asyncIssues.push({
          file: relativePath,
          line: i + 1,
          code: line.trim().substring(0, 60),
        });
      }
    }
  });
});

if (asyncIssues.length > 0) {
  console.log('⚠️  Found async patterns (may need Suspense):');
  asyncIssues.slice(0, 5).forEach(issue => {
    console.log(`  ${issue.file}:${issue.line}`);
    console.log(`    ${issue.code}...\n`);
  });
} else {
  console.log('✅ No suspicious async patterns found\n');
}

// Check 3: Check build status
console.log('\nCHECK 3: Build/deployment status\n');

console.log('To verify if code changes are deployed:');
console.log('  1. Go to: https://crm.swaryoga.com');
console.log('  2. Open DevTools → Network tab');
console.log('  3. Refresh page and look at bundle version');
console.log('  4. If getting old cached bundle, hard refresh (Cmd+Shift+R)\n');

// Recommendation
console.log('════════════════════════════════════════════════════');
console.log('\nRECOMMENDATION:\n');
console.log('These React errors might be caused by:');
console.log('  1. Stale build cache - hard refresh browser (Cmd+Shift+R)');
console.log('  2. Vercel cache - might be serving old version');
console.log('  3. Missing Suspense boundary around async component');
console.log('  4. useState called in async context\n');
console.log('Try:');
console.log('  1. npm run build  (rebuild locally)');
console.log('  2. npm run dev    (test in development)');
console.log('  3. vercel --prod  (redeploy to production)\n');
