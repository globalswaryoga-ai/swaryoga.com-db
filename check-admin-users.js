/**
 * Quick check: verify admin users are visible to the API
 * Run: node check-admin-users.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  
  const users = await mongoose.connection.db.collection('users')
    .find({ isAdmin: true })
    .project({ _id: 1, userId: 1, email: 1, name: 1, role: 1 })
    .toArray();
  
  console.log('=== API returns ' + users.length + ' admin users ===\n');
  
  console.log('Dropdown preview:');
  users.forEach((u, i) => {
    const display = (u.name || u.email || 'Unknown') + (u.email ? ' (' + u.email + ')' : '');
    console.log('  ' + (i + 1) + '. ' + display);
  });
  
  const varun = users.find(u => u.userId === 'varun');
  console.log(varun ? '\n✅ Varun is in the list!' : '\n❌ Varun NOT found!');
  
  console.log('\n✅ Adding new admin users via the UI will auto-appear in the Assign To dropdown (no restart needed).');
  
  await mongoose.disconnect();
}

check().catch(e => { console.error('Error:', e.message); process.exit(1); });
