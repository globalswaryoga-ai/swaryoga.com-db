#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const QR_PAGE_PATH = path.join(__dirname, '../app/admin/crm/qr/page.tsx');
const content = fs.readFileSync(QR_PAGE_PATH, 'utf-8');

console.log('═'.repeat(80));
console.log('🔍 QR WHATSAPP HEALTH CHECK - COMPREHENSIVE CODE ANALYSIS');
console.log('═'.repeat(80));
console.log();

// ═════════════════════════════════════════════════════════════════════════════
// 1. IMPORTS & DEPENDENCIES CHECK
// ═════════════════════════════════════════════════════════════════════════════
console.log('📦 SECTION 1: IMPORTS & DEPENDENCIES');
console.log('─'.repeat(80));

const imports = [
  { name: 'React', pattern: /import React/ },
  { name: 'useRouter', pattern: /useRouter/ },
  { name: 'useAuth hook', pattern: /useAuth/ },
  { name: 'useCRM hook', pattern: /useCRM/ },
  { name: 'Lucide icons', pattern: /from 'lucide-react'/ },
  { name: 'QR Code', pattern: /qrcode/ },
  { name: 'Emoji Picker', pattern: /emoji-picker/ },
];

const importIssues = [];
imports.forEach(imp => {
  if (content.match(imp.pattern)) {
    console.log(`  ✅ ${imp.name.padEnd(25)} - Present`);
  } else {
    console.log(`  ❌ ${imp.name.padEnd(25)} - MISSING`);
    importIssues.push(imp.name);
  }
});

console.log();

// ═════════════════════════════════════════════════════════════════════════════
// 2. STATE HOOKS CHECK
// ═════════════════════════════════════════════════════════════════════════════
console.log('🎣 SECTION 2: STATE HOOKS (useState, useRef, useEffect)');
console.log('─'.repeat(80));

const hookPatterns = [
  { name: 'useState calls', pattern: /useState</g },
  { name: 'useRef calls', pattern: /useRef</g },
  { name: 'useEffect calls', pattern: /useEffect</g },
  { name: 'useCallback calls', pattern: /useCallback</g },
];

let totalHooks = 0;
hookPatterns.forEach(hook => {
  const matches = content.match(hook.pattern) || [];
  const count = matches.length;
  totalHooks += count;
  console.log(`  ${hook.name.padEnd(25)} - ${count} instances`);
});

console.log(`  📊 Total Hook Instances: ${totalHooks}`);
console.log();

// ═════════════════════════════════════════════════════════════════════════════
// 3. REF DEFINITIONS CHECK
// ═════════════════════════════════════════════════════════════════════════════
console.log('🔗 SECTION 3: REF DEFINITIONS (useRef with identifiers)');
console.log('─'.repeat(80));

const refMatches = [...content.matchAll(/const\s+(\w+Ref)\s*=\s*useRef/g)];
const refs = new Map();

refMatches.forEach(match => {
  const refName = match[1];
  const position = content.substring(0, match.index).split('\n').length;
  
  if (refs.has(refName)) {
    refs.get(refName).count++;
    refs.get(refName).lines.push(position);
  } else {
    refs.set(refName, { count: 1, lines: [position] });
  }
});

let refIssues = 0;
refs.forEach((info, refName) => {
  if (info.count > 1) {
    console.log(`  ⚠️  ${refName.padEnd(30)} - DUPLICATE (${info.count} times at lines ${info.lines.join(', ')})`);
    refIssues++;
  } else {
    console.log(`  ✅ ${refName.padEnd(30)} - OK`);
  }
});

if (refIssues === 0) {
  console.log(`  ✅ No duplicate ref definitions found!`);
}
console.log();

// ═════════════════════════════════════════════════════════════════════════════
// 4. API ENDPOINTS USAGE CHECK
// ═════════════════════════════════════════════════════════════════════════════
console.log('🔌 SECTION 4: API ENDPOINTS CALLED');
console.log('─'.repeat(80));

const endpoints = [
  { name: '/api/admin/crm/settings', pattern: /\/api\/admin\/crm\/settings/g },
  { name: '/api/admin/crm/whatsapp/qr/auto-provision', pattern: /\/api\/admin\/crm\/whatsapp\/qr\/auto-provision/g },
  { name: '/api/admin/crm/whatsapp/qr-bridge', pattern: /qr-bridge|bridgeCall/g },
  { name: '/api/admin/crm/whatsapp/qr/send', pattern: /\/send|path === '\/send'/g },
  { name: '/api/admin/crm/whatsapp/qr/broadcast', pattern: /broadcast/g },
];

console.log('  Direct fetch() calls to APIs:');
endpoints.forEach(ep => {
  const matches = content.match(ep.pattern) || [];
  const count = matches.length;
  if (count > 0) {
    console.log(`    ✅ ${ep.name.padEnd(45)} - ${count} calls`);
  }
});
console.log();

// ═════════════════════════════════════════════════════════════════════════════
// 5. CRITICAL FUNCTIONS CHECK
// ═════════════════════════════════════════════════════════════════════════════
console.log('⚙️  SECTION 5: CRITICAL FUNCTIONS (useCallback definitions)');
console.log('─'.repeat(80));

const functions = [
  { name: 'fetchStatus', desc: 'Fetch bridge connection status' },
  { name: 'fetchChats', desc: 'Fetch WhatsApp chats' },
  { name: 'fetchMessages', desc: 'Fetch messages for a chat' },
  { name: 'bridgeCall', desc: 'Make bridge API calls' },
  { name: 'sendMessage', desc: 'Send WhatsApp message' },
  { name: 'saveBridgeConfig', desc: 'Save bridge URL to settings' },
  { name: 'saveToMongoDB', desc: 'Save settings to MongoDB' },
  { name: 'handleBroadcastSend', desc: 'Send broadcast message' },
  { name: 'fetchProfilePic', desc: 'Fetch contact profile picture' },
];

let functionIssues = 0;
functions.forEach(func => {
  const pattern = new RegExp(`(const|useCallback.*?)(\\s+${func.name}\\s*=|function\\s+${func.name})`, 'g');
  if (content.match(pattern)) {
    console.log(`  ✅ ${func.name.padEnd(28)} - ${func.desc}`);
  } else {
    console.log(`  ⚠️  ${func.name.padEnd(28)} - ${func.desc} (not found or incomplete)`);
    functionIssues++;
  }
});

if (functionIssues > 0) {
  console.log(`  ⚠️  ${functionIssues} functions may have issues`);
}
console.log();

// ═════════════════════════════════════════════════════════════════════════════
// 6. AUTHENTICATION & ACCESS CONTROL CHECK
// ═════════════════════════════════════════════════════════════════════════════
console.log('🔐 SECTION 6: AUTH & ACCESS CONTROL');
console.log('─'.repeat(80));

const authChecks = [
  { name: 'token validation', pattern: /if\s*\(\s*!token/ },
  { name: 'Bearer token header', pattern: /Authorization.*Bearer/ },
  { name: 'Super admin check', pattern: /superAdmin|isSuperAdmin/ },
  { name: 'QR access gate', pattern: /bridgeConfigured|NO_BRIDGE/ },
  { name: 'User ID tracking', pattern: /currentUserId|resolvedUserId/ },
];

authChecks.forEach(check => {
  if (content.match(check.pattern)) {
    console.log(`  ✅ ${check.name.padEnd(35)} - Implemented`);
  } else {
    console.log(`  ❌ ${check.name.padEnd(35)} - NOT FOUND`);
  }
});
console.log();

// ═════════════════════════════════════════════════════════════════════════════
// 7. ERROR HANDLING & GRACEFUL DEGRADATION
// ═════════════════════════════════════════════════════════════════════════════
console.log('🛡️  SECTION 7: ERROR HANDLING');
console.log('─'.repeat(80));

const errorHandlers = [
  { name: 'try/catch blocks', pattern: /try\s*{|catch\s*\(/g },
  { name: 'Error state management', pattern: /error|setError/g },
  { name: 'Loading states', pattern: /loading|setLoading/g },
  { name: 'Fallback/default values', pattern: /\|\||\/\//g },
  { name: 'Non-blocking API calls', pattern: /\.catch\(\s*\(\)\s*=>\s*null/g },
];

let errorIssuesCount = 0;
errorHandlers.forEach(handler => {
  const matches = content.match(handler.pattern) || [];
  if (matches.length > 0) {
    console.log(`  ✅ ${handler.name.padEnd(35)} - ${matches.length} instances`);
  } else {
    console.log(`  ⚠️  ${handler.name.padEnd(35)} - Not found`);
    errorIssuesCount++;
  }
});

if (errorIssuesCount > 0) {
  console.log(`  ⚠️  Some error handling patterns missing`);
}
console.log();

// ═════════════════════════════════════════════════════════════════════════════
// 8. BRIDGE INTEGRATION CHECK
// ═════════════════════════════════════════════════════════════════════════════
console.log('🌉 SECTION 8: BRIDGE INTEGRATION');
console.log('─'.repeat(80));

const bridgeFeatures = [
  { name: 'QR code display', pattern: /qrData|setQrData|QRCodeComponent/g },
  { name: 'Bridge URL handling', pattern: /bridgeUrl|qrBridgeUrl|bridgeConfigured/g },
  { name: 'Bridge secret storage', pattern: /qrBridgeSecret|bridgeSecret/g },
  { name: 'Connection status polling', pattern: /pollRef|setInterval.*fetchStatus|adaptive poll/g },
  { name: 'Auto-switch to inbox', pattern: /hasAutoSwitchedRef|auto-switch/g },
  { name: 'Phone number extraction', pattern: /savedPhoneRef|status\.phone/g },
];

bridgeFeatures.forEach(feature => {
  const matches = content.match(feature.pattern) || [];
  if (matches.length > 0) {
    console.log(`  ✅ ${feature.name.padEnd(35)} - Implemented`);
  } else {
    console.log(`  ⚠️  ${feature.name.padEnd(35)} - May be incomplete`);
  }
});
console.log();

// ═════════════════════════════════════════════════════════════════════════════
// 9. DATA PERSISTENCE CHECK
// ═════════════════════════════════════════════════════════════════════════════
console.log('💾 SECTION 9: DATA PERSISTENCE');
console.log('─'.repeat(80));

const persistence = [
  { name: 'MongoDB settings save', pattern: /saveToMongoDB|PUT.*settings|qrFunnelStages/g },
  { name: 'localStorage caching', pattern: /localStorage.setItem|localStorage.getItem/g },
  { name: 'Debounced saves', pattern: /settingsSaveTimerRef|setTimeout.*500/g },
  { name: 'Pending updates batching', pattern: /pendingUpdatesRef/g },
  { name: 'Auto-save on state change', pattern: /useEffect.*saveToMongoDB/g },
];

persistence.forEach(p => {
  const matches = content.match(p.pattern) || [];
  if (matches.length > 0) {
    console.log(`  ✅ ${p.name.padEnd(35)} - ${matches.length} patterns`);
  } else {
    console.log(`  ⚠️  ${p.name.padEnd(35)} - Not found`);
  }
});
console.log();

// ═════════════════════════════════════════════════════════════════════════════
// 10. UI COMPONENTS CHECK
// ═════════════════════════════════════════════════════════════════════════════
console.log('🎨 SECTION 10: UI COMPONENTS & TABS');
console.log('─'.repeat(80));

const uiTabs = [
  { name: 'Connection Tab', pattern: /tab === 'connection'|Connection/g },
  { name: 'Inbox Tab', pattern: /tab === 'inbox'|Inbox/g },
  { name: 'Settings Tab', pattern: /tab === 'settings'|Settings/g },
  { name: 'Bridge configuration modal', pattern: /showBridgeSettings|Bridge.*Config/g },
  { name: 'Funnel/Label management', pattern: /editModal|openEditModal|FunnelStage/g },
  { name: 'Message composer', pattern: /composerText|sendMessage/g },
];

uiTabs.forEach(tab => {
  const matches = content.match(tab.pattern) || [];
  if (matches.length > 0) {
    console.log(`  ✅ ${tab.name.padEnd(35)} - Implemented`);
  } else {
    console.log(`  ❌ ${tab.name.padEnd(35)} - MISSING`);
  }
});
console.log();

// ═════════════════════════════════════════════════════════════════════════════
// 11. PERFORMANCE OPTIMIZATIONS CHECK
// ═════════════════════════════════════════════════════════════════════════════
console.log('⚡ SECTION 11: PERFORMANCE OPTIMIZATIONS');
console.log('─'.repeat(80));

const perf = [
  { name: 'Visibility-based polling pause', pattern: /visibilitychange|isPageVisible|document.hidden/g },
  { name: 'Adaptive poll intervals', pattern: /connected.*15000.*6000|adaptive/g },
  { name: 'Debounced settings saves', pattern: /settingsSaveTimerRef.*setTimeout.*500/g },
  { name: 'Lazy profile pic loading', pattern: /profilePicLoadedRef|slice\(0.*30\)/g },
  { name: 'Ref-based state updates', pattern: /Ref\.current\s*=/g },
  { name: 'useCallback memoization', pattern: /useCallback/g },
];

perf.forEach(p => {
  const matches = content.match(p.pattern) || [];
  if (matches.length > 0) {
    console.log(`  ✅ ${p.name.padEnd(35)} - Implemented`);
  } else {
    console.log(`  ⚠️  ${p.name.padEnd(35)} - Not found`);
  }
});
console.log();

// ═════════════════════════════════════════════════════════════════════════════
// 12. SECURITY CHECKS
// ═════════════════════════════════════════════════════════════════════════════
console.log('🔒 SECTION 12: SECURITY');
console.log('─'.repeat(80));

const security = [
  { name: 'Direct fetch (no useCRM auto-logout)', pattern: /fetch\('\/api\/admin\/crm/g },
  { name: 'Bearer token authentication', pattern: /Authorization.*Bearer.*token/g },
  { name: 'Bridge secret storage', pattern: /qrBridgeSecret|bridgeSecret/g },
  { name: 'User isolation checks', pattern: /currentUserId|isSuperAdmin|assignedToUserId/g },
  { name: 'HTTPS URL validation', pattern: /https?:\/\//g },
  { name: 'Chat privacy filtering', pattern: /assignedToUserId|createdByUserId/g },
];

security.forEach(s => {
  const matches = content.match(s.pattern) || [];
  if (matches.length > 0) {
    console.log(`  ✅ ${s.name.padEnd(40)} - Present`);
  } else {
    console.log(`  ⚠️  ${s.name.padEnd(40)} - Check needed`);
  }
});
console.log();

// ═════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═════════════════════════════════════════════════════════════════════════════
console.log('═'.repeat(80));
console.log('📊 SUMMARY');
console.log('═'.repeat(80));

const stats = {
  lines: content.split('\n').length,
  usernames: (content.match(/@/g) || []).length,
  functions: (content.match(/const \w+ = useCallback/g) || []).length,
  refs: refs.size,
  hooks: totalHooks,
  importIssues,
  refIssues,
  functionIssues,
  errorIssuesCount,
};

console.log(`
  📄 File Size: ${(content.length / 1024).toFixed(1)} KB
  📝 Total Lines: ${stats.lines}
  🎣 Total Hook Instances: ${stats.hooks}
  🔗 Unique Refs: ${stats.refs}
  ⚙️  useCallback Functions: ${stats.functions}
  
  ⚠️  Issues Found:
     - Import Issues: ${stats.importIssues.length > 0 ? stats.importIssues.length + ' (' + stats.importIssues.join(', ') + ')' : '0 ✅'}
     - Duplicate Refs: ${stats.refIssues}
     - Missing Functions: ${stats.functionIssues}
     - Error Handling Gaps: ${stats.errorIssuesCount}
`);

// ═════════════════════════════════════════════════════════════════════════════
// HEALTH SCORE
// ═════════════════════════════════════════════════════════════════════════════
const totalIssues = stats.importIssues.length + stats.refIssues + stats.functionIssues + stats.errorIssuesCount;
const maxIssues = 10;
const healthScore = Math.max(0, 100 - (totalIssues * 10));

console.log('═'.repeat(80));
console.log('🏥 HEALTH SCORE');
console.log('═'.repeat(80));
console.log(`
  Health Score: ${healthScore}% ${getHealthEmoji(healthScore)}
  Total Issues: ${totalIssues}
  ${getHealthMessage(healthScore)}
`);

console.log('═'.repeat(80));

function getHealthEmoji(score) {
  if (score >= 90) return '✅ EXCELLENT';
  if (score >= 75) return '🟢 GOOD';
  if (score >= 60) return '🟡 FAIR';
  if (score >= 40) return '🟠 NEEDS FIXING';
  return '🔴 CRITICAL';
}

function getHealthMessage(score) {
  if (score >= 90) return `✅ QR WhatsApp code is in EXCELLENT condition. All Core systems operational.`;
  if (score >= 75) return `🟢 QR WhatsApp code is GOOD. Minor issues to address but fundamentally sound.`;
  if (score >= 60) return `🟡 QR WhatsApp code is FAIR. Some issues need attention before production.`;
  if (score >= 40) return `🟠 QR WhatsApp code NEEDS FIXING. Multiple issues blocking stability.`;
  return `🔴 QR WhatsApp code is CRITICAL. Major refactoring required before use.`;
}
