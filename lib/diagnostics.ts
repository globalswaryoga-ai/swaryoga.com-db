// Diagnostic script to check Life Planner data saving system
'use client';

export const runDiagnostics = () => {
  if (typeof window === 'undefined') {
    console.log('❌ Window not available (server-side)');
    return;
  }

  console.log('🔍 Life Planner Data Saving System Diagnostics');
  console.log('============================================');

  // 1. Check localStorage availability
  console.log('\n1️⃣ localStorage Availability:');
  try {
    const test = '__test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    console.log('✅ localStorage available');
  } catch (e) {
    console.log('❌ localStorage not available:', e);
    return;
  }

  // 2. Check storage keys
  console.log('\n2️⃣ Storage Keys:');
  const keys = [
    'swar-life-planner-visions',
    'swar-life-planner-goals',
    'swar-life-planner-tasks',
    'swar-life-planner-todos',
    'swar-life-planner-words',
    'swar-life-planner-reminders',
  ];

  keys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        console.log(`✅ ${key}: ${parsed.length || 'data'} items`);
      } catch {
        console.log(`⚠️ ${key}: Invalid JSON`);
      }
    } else {
      console.log(`⚪ ${key}: Empty`);
    }
  });

  // 3. Check permanent storage backup
  console.log('\n3️⃣ Permanent Storage Backup:');
  const backup = localStorage.getItem('swar-life-planner-complete-backup');
  if (backup) {
    try {
      const parsed = JSON.parse(backup);
      console.log('✅ Backup found');
      console.log('   - Visions:', parsed.visions?.length || 0);
      console.log('   - Goals:', parsed.goals?.length || 0);
      console.log('   - Tasks:', parsed.tasks?.length || 0);
      console.log('   - Todos:', parsed.todos?.length || 0);
      console.log('   - Last sync:', new Date(parsed.lastSyncTime).toLocaleString());
    } catch {
      console.log('⚠️ Backup found but invalid JSON');
    }
  } else {
    console.log('⚪ No backup found');
  }

  // 4. Check visions specifically
  console.log('\n4️⃣ Visions Data:');
  const visionsData = localStorage.getItem('swar-life-planner-visions');
  if (visionsData) {
    try {
      const visions = JSON.parse(visionsData);
      console.log(`✅ Found ${visions.length} visions`);
      visions.forEach((v: any, i: number) => {
        console.log(`   ${i + 1}. "${v.title}" (${v.category}) - Status: ${v.status}`);
      });
    } catch {
      console.log('❌ Visions data is corrupted');
    }
  } else {
    console.log('⚪ No visions saved yet');
  }

  // 5. Check IndexedDB
  console.log('\n5️⃣ IndexedDB Status:');
  if (!window.indexedDB) {
    console.log('⚪ IndexedDB not available');
  } else {
    console.log('✅ IndexedDB available');
  }

  // 6. Check session data
  console.log('\n6️⃣ Session Data:');
  const user = localStorage.getItem('user');
  const token = localStorage.getItem('token');
  const sessionExpiry = localStorage.getItem('sessionExpiry');

  if (user) {
    try {
      const userData = JSON.parse(user);
      console.log(`✅ User logged in: ${userData.email}`);
    } catch {
      console.log('⚠️ User data corrupted');
    }
  } else {
    console.log('⚪ No user data');
  }

  if (token) {
    console.log('✅ Session token present');
  } else {
    console.log('⚪ No session token');
  }

  if (sessionExpiry) {
    const expiryTime = new Date(parseInt(sessionExpiry));
    const now = new Date();
    if (expiryTime > now) {
      const hoursLeft = Math.round((expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60));
      console.log(`✅ Session valid - expires in ${hoursLeft} hours`);
    } else {
      console.log('❌ Session expired');
    }
  }

  // 7. Storage quota
  console.log('\n7️⃣ Storage Quota:');
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then((estimate: any) => {
      const usedMB = ((estimate.usage || 0) / 1024 / 1024).toFixed(2);
      const quotaMB = ((estimate.quota || 0) / 1024 / 1024).toFixed(2);
      const percentage = (((estimate.usage || 0) / (estimate.quota || 1)) * 100).toFixed(1);
      console.log(`📊 Using ${usedMB}MB of ${quotaMB}MB (${percentage}%)`);
    });
  }

  console.log('\n============================================');
  console.log('✅ Diagnostics complete!');
};

// Export for use in console
if (typeof window !== 'undefined') {
  (window as any).runDiagnostics = runDiagnostics;
  console.log('💡 Run diagnostics with: runDiagnostics()');
}
