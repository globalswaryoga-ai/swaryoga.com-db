/**
 * Update Vijay Sir permissions: read-only everywhere, full Tally access
 * Run: node update-vijay-permissions.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function update() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  console.log('Connected to database');

  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');

  const result = await usersCollection.updateOne(
    { userId: 'vijay' },
    {
      $set: {
        isSuperAdmin: false,
        role: 'md_viewer',
        permissions: ['crm', 'whatsapp', 'tally'],
        granularPermissions: {
          isSuperAdmin: false,
          leads:      { read: true, write: false, delete: false, export: true, assignToOthers: false, viewAll: true },
          contacts:   { read: true, write: false, delete: false, export: true },
          customers:  { read: true, write: false, delete: false, export: true },
          whatsapp:   { read: true, send: false, broadcast: false, manageGroups: false, viewMedia: true },
          email:      { read: true, send: false, broadcast: false, manageTemplates: false },
          messages:   { read: true, send: false, delete: false },
          broadcasts: { read: true, create: false, send: false, schedule: false, delete: false },
          templates:  { read: true, write: false, delete: false },
          workshops:  { read: true, write: false, delete: false, manageRegistrations: false, viewPayments: true },
          payments:   { read: true, write: false, refund: false, export: true },
          invoices:   { read: true, write: false, delete: false, export: true },
          analytics:  { read: true, export: true },
          reports:    { read: true, create: false, export: true },
          dashboard:  { read: true },
          users:      { read: true, write: false, delete: false, managePermissions: false },
          settings:   { read: true, write: false },
          auditLogs:  { read: true, export: true },
          tally:      { read: true, write: true, delete: true, sync: true, export: true },
        },
        updatedAt: new Date(),
      }
    }
  );

  console.log('Updated:', result.modifiedCount);

  const user = await usersCollection.findOne({ userId: 'vijay' });
  console.log('\nVerified user:');
  console.log('  userId:', user.userId);
  console.log('  name:', user.name);
  console.log('  email:', user.email);
  console.log('  isAdmin:', user.isAdmin);
  console.log('  isSuperAdmin:', user.isSuperAdmin);
  console.log('  role:', user.role);
  console.log('  permissions:', JSON.stringify(user.permissions));
  console.log('  tally perms:', JSON.stringify(user.granularPermissions.tally));
  console.log('  leads perms:', JSON.stringify(user.granularPermissions.leads));

  await mongoose.disconnect();
  console.log('\nDone!');
}

update().catch(e => { console.error(e); process.exit(1); });
