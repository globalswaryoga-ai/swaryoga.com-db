#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 CODE COMPLEXITY ANALYSIS');
console.log('═══════════════════════════════════════\n');

// 1. Find all TypeScript files
const tsFiles = execSync('find app lib -name "*.ts" -not -path "*/node_modules/*" 2>/dev/null || true')
  .toString()
  .split('\n')
  .filter(f => f.trim());

console.log(`📊 Files Analyzed: ${tsFiles.length}`);
console.log();

// 2. Analyze file sizes and complexity
const fileMetrics = tsFiles.map(file => {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n').length;
    const functions = (content.match(/function |const.*=.*=>|export.*function/g) || []).length;
    const imports = (content.match(/^import /gm) || []).length;
    const classicComplexity = (content.match(/if\s*\(|for\s*\(|while\s*\(|switch\s*\(/g) || []).length;
    
    return {
      file,
      lines,
      functions,
      imports,
      complexity: classicComplexity,
      avgComplexityPerFunction: functions > 0 ? (classicComplexity / functions).toFixed(2) : 0,
      ratio: (lines / (functions || 1)).toFixed(1)
    };
  } catch (e) {
    return null;
  }
}).filter(Boolean);

// 3. Sort by complexity
const sorted = fileMetrics.sort((a, b) => b.complexity - a.complexity);

// 4. Display top complex files
console.log('🔴 TOP 10 MOST COMPLEX FILES:\n');
sorted.slice(0, 10).forEach((m, i) => {
  const complexity = m.complexity > 15 ? '🔴 HIGH' : m.complexity > 8 ? '🟡 MEDIUM' : '🟢 LOW';
  console.log(`${i + 1}. ${m.file}`);
  console.log(`   Lines: ${m.lines} | Functions: ${m.functions} | Complexity: ${m.complexity} ${complexity}`);
  console.log(`   Avg Complexity/Fn: ${m.avgComplexityPerFunction}\n`);
});

// 5. Statistics
const avgLines = (fileMetrics.reduce((sum, m) => sum + m.lines, 0) / fileMetrics.length).toFixed(0);
const avgFunctions = (fileMetrics.reduce((sum, m) => sum + m.functions, 0) / fileMetrics.length).toFixed(1);
const avgComplexity = (fileMetrics.reduce((sum, m) => sum + m.complexity, 0) / fileMetrics.length).toFixed(2);
const totalLines = fileMetrics.reduce((sum, m) => sum + m.lines, 0);

console.log('\n📈 STATISTICS:');
console.log(`   Average File Size: ${avgLines} lines`);
console.log(`   Average Functions: ${avgFunctions} per file`);
console.log(`   Average Complexity: ${avgComplexity} per file`);
console.log(`   Total Lines: ${totalLines}`);

// 6. Recommendations
console.log('\n💡 RECOMMENDATIONS:\n');

const highComplexity = sorted.filter(m => m.complexity > 15);
if (highComplexity.length > 0) {
  console.log(`🔴 Refactor ${highComplexity.length} files with HIGH complexity:`);
  highComplexity.slice(0, 5).forEach(m => {
    console.log(`   - ${m.file} (${m.complexity} issues)`);
  });
  console.log();
}

const largeFiles = fileMetrics.filter(m => m.lines > 500);
if (largeFiles.length > 0) {
  console.log(`📏 Split ${largeFiles.length} large files (>500 lines):`);
  largeFiles.slice(0, 5).forEach(m => {
    console.log(`   - ${m.file} (${m.lines} lines)`);
  });
  console.log();
}

console.log('✅ Analysis Complete!\n');
