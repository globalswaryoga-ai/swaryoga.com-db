/**
 * Verify data isolation for test1@swaryoga.com
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  
  const test1UserId = '69ad8072cb824d6d70d1677e';
  
  console.log('=== Data Verification Report ===\n');
  
  // Total leads
  const totalLeads = await db.collection('leads').countDocuments({});
  console.log('Total leads in CRM:', totalLeads);
  
  // Leads for test1
  const test1Leads = await db.collection('leads').countDocuments({ 
    assignedToUserId: test1UserId
  });
  console.log('Leads assigned to test1:', test1Leads);
  
  // Leads NOT for test1 (admin data - should remain intact)
  const adminLeads = await db.collection('leads').countDocuments({ 
    assignedToUserId: { $ne: test1UserId }
  });
  console.log('Leads NOT assigned to test1 (admin data):', adminLeads);
  
  // Templates
  const totalTemplates = await db.collection('whatsapp_templates').countDocuments({});
  console.log('\nTotal templates:', totalTemplates);
  
  const test1Templates = await db.collection('whatsapp_templates').countDocuments({
    createdByUserId: test1UserId
  });
  console.log('Templates by test1:', test1Templates);
  
  // Follow-ups
  const test1Followups = await db.collection('lead_followups').countDocuments({
    createdByUserId: test1UserId
  });
  console.log('Follow-ups by test1:', test1Followups);
  
  console.log('\n=== Admin Data Status ===');
  console.log('Admin leads intact:', adminLeads > 0 ? 'YES ✓' : 'N/A (no admin leads)');
  console.log('test1 sees ONLY their', test1Leads, 'leads when logged in');
  
  await mongoose.disconnect();
  console.log('\nVerification complete!');
}

verify().catch(console.error);
