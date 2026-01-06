const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
if (!uri) {
  console.log('❌ No MONGODB_URI configured');
  process.exit(1);
}

mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  
  console.log('🔍 Checking Lead collection...\n');
  
  // Check lead count
  const leadCount = await db.collection('leads').countDocuments({});
  console.log(`📊 Total leads in database: ${leadCount}`);
  
  if (leadCount === 0) {
    console.log('\n⚠️  NO LEADS FOUND - This explains why broadcast shows 0\n');
    console.log('Possible reasons:');
    console.log('1. Leads have not been created yet');
    console.log('2. Leads are in a different database');
    console.log('3. Lead collection is empty\n');
    process.exit(0);
  }
  
  // Sample a few leads
  const samples = await db.collection('leads').find({}).limit(3).toArray();
  console.log(`\n📝 Sample leads (showing 3 of ${leadCount}):\n`);
  samples.forEach((lead, i) => {
    console.log(`Lead ${i+1}:`);
    console.log(`  ID: ${lead._id}`);
    console.log(`  Name: ${lead.name}`);
    console.log(`  Phone: ${lead.phoneNumber}`);
    console.log(`  Status: ${lead.status}`);
    console.log(`  Assigned To: ${lead.assignedToUserId || 'Unassigned'}`);
    console.log(`  Workshop: ${lead.workshopName || 'None'}`);
    console.log('');
  });
  
  // Check for issues
  const unassignedCount = await db.collection('leads').countDocuments({ assignedToUserId: { $exists: false } });
  const assignedCount = leadCount - unassignedCount;
  
  console.log('\n📈 Lead Distribution:');
  console.log(`  Assigned: ${assignedCount}`);
  console.log(`  Unassigned: ${unassignedCount}`);
  
  // Check statuses
  const statuses = await db.collection('leads').aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]).toArray();
  
  console.log('\n🏷️  Statuses:');
  statuses.forEach(s => {
    console.log(`  ${s._id || 'None'}: ${s.count}`);
  });
  
  process.exit(0);
}).catch(err => {
  console.log('❌ DB Error:', err.message);
  process.exit(1);
});
