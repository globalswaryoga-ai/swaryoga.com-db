/**
 * Deep investigation: trace the EXACT data flow for a non-admin user.
 * Find ALL leak points.
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function investigate() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  const crm = mongoose.connection.useDb('swaryoga_admin_crm');

  console.log('=== 1. ALL ADMIN USERS ===');
  const admins = await db.collection('users').find({ isAdmin: true })
    .project({ userId: 1, email: 1, name: 1, isAdmin: 1, permissions: 1, permissionsV2: 1, role: 1 })
    .toArray();
  
  for (const u of admins) {
    const uid = u.userId || u.email;
    const perms = Array.isArray(u.permissions) ? u.permissions : [];
    const pv2 = u.permissionsV2 || {};
    const isSA = uid === 'admin' || uid === 'admincrm' 
      || perms.includes('all') || pv2.isSuperAdmin === true;
    console.log(`  ${uid} | email: ${u.email} | SA: ${isSA} | perms: ${JSON.stringify(perms)} | pv2: ${JSON.stringify(pv2)}`);
  }

  console.log('\n=== 2. ALL CRM USER SETTINGS ===');
  const allSettings = await crm.collection('crm_user_settings').find({}).toArray();
  for (const s of allSettings) {
    console.log(`  ${s.userId} | url: ${s.qrBridgeUrl || '(none)'} | secret: ${s.qrBridgeSecret ? 'SET' : '(none)'} | enabled: ${s.qrWhatsappEnabled || false}`);
  }

  console.log('\n=== 3. CRM LEADS COUNT (this is what shows in chat list) ===');
  const totalLeads = await crm.collection('leads').countDocuments();
  console.log(`  Total CRM leads: ${totalLeads}`);
  
  // Check if leads have assignedToUserId
  const leadsWithAssignment = await crm.collection('leads').countDocuments({ assignedToUserId: { $exists: true, $ne: null } });
  const leadsWithoutAssignment = await crm.collection('leads').countDocuments({ $or: [{ assignedToUserId: { $exists: false } }, { assignedToUserId: null }] });
  console.log(`  Leads WITH assignedToUserId: ${leadsWithAssignment}`);
  console.log(`  Leads WITHOUT assignedToUserId: ${leadsWithoutAssignment}`);

  // Sample leads to see what they look like
  const sampleLeads = await crm.collection('leads').find({}).limit(5)
    .project({ phoneNumber: 1, name: 1, assignedToUserId: 1, createdByUserId: 1, source: 1 }).toArray();
  console.log('  Sample leads:');
  sampleLeads.forEach(l => console.log(`    ${l.phoneNumber} | name: ${l.name} | assigned: ${l.assignedToUserId || '(none)'} | created: ${l.createdByUserId || '(none)'}`));

  console.log('\n=== 4. WHATSAPP MESSAGES IN DB ===');
  const totalMsgs = await crm.collection('whatsapp_messages').countDocuments();
  const msgsByOwner = await crm.collection('whatsapp_messages').aggregate([
    { $group: { _id: '$bridgeUserId', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log(`  Total messages: ${totalMsgs}`);
  console.log('  By owner:');
  msgsByOwner.forEach(g => console.log(`    ${g._id || '(none/legacy)'}: ${g.count}`));

  console.log('\n=== 5. LEADS API LEAK CHECK ===');
  // The frontend fetches /api/admin/crm/leads?selectAll=true&limit=5000
  // Does this API filter by user? Check the route
  const fs = require('fs');
  try {
    const leadsRoute = fs.readFileSync('app/api/admin/crm/leads/route.ts', 'utf8');
    const hasUserFilter = leadsRoute.includes('viewerUserId') || leadsRoute.includes('assignedToUserId') || leadsRoute.includes('getViewerUserId');
    const hasSuperAdminCheck = leadsRoute.includes('isSuperAdmin') || leadsRoute.includes('superAdmin');
    console.log(`  leads/route.ts has user filter: ${hasUserFilter}`);
    console.log(`  leads/route.ts has superAdmin check: ${hasSuperAdminCheck}`);
    
    // Check if the leads API returns ALL leads to any admin user
    if (leadsRoute.includes('selectAll')) {
      console.log('  ⚠️  leads API supports selectAll parameter');
    }
  } catch (e) {
    console.log('  Could not read leads route:', e.message);
  }

  console.log('\n=== 6. FRONTEND CHAT MERGE LEAK ===');
  try {
    const pageFile = fs.readFileSync('app/admin/crm/qr/page.tsx', 'utf8');
    // Check if fetchChats adds CRM leads to chat list
    const addsCrmLeads = pageFile.includes('Add CRM leads') || pageFile.includes("don't have a matching QR chat");
    console.log(`  page.tsx adds CRM leads to chat list: ${addsCrmLeads}`);
    if (addsCrmLeads) {
      console.log('  ⚠️  THIS IS A LEAK POINT: Frontend adds ALL CRM leads to chat list regardless of user');
    }
  } catch (e) {
    console.log('  Could not read page.tsx:', e.message);
  }

  console.log('\n=== 7. VERCEL DEPLOYMENT CHECK ===');
  const { execSync } = require('child_process');
  const lastCommit = execSync('git log --oneline -3', { encoding: 'utf8' });
  console.log('  Last 3 commits:');
  console.log('  ' + lastCommit.replace(/\n/g, '\n  '));

  await mongoose.disconnect();
}

investigate().catch(e => { console.error(e); process.exit(1); });
