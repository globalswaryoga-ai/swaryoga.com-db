/**
 * Add demo data for test1@swaryoga.com
 * 5 leads + 2 templates + 2 follow-ups
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function addDemoData() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  
  const test1UserId = '69ad8072cb824d6d70d1677e';
  const now = new Date();
  
  console.log('Adding demo data for test1@swaryoga.com (userId:', test1UserId, ')');
  
  // 1. Add 5 demo leads
  const dummyLeads = [
    {
      name: 'Demo Lead 1 - Rahul Sharma',
      phoneNumber: '9876543210',
      email: 'demo.rahul@example.com',
      status: 'new',
      source: 'website',
      workshopName: 'Swaryoga Basic',
      notes: 'Interested in weekend batch',
      assignedToUserId: test1UserId,
      createdByUserId: test1UserId,
      createdAt: now,
      updatedAt: now
    },
    {
      name: 'Demo Lead 2 - Priya Patel',
      phoneNumber: '9876543211',
      email: 'demo.priya@example.com',
      status: 'contacted',
      source: 'referral',
      workshopName: 'Swaryoga Advanced',
      notes: 'Follow up next week',
      assignedToUserId: test1UserId,
      createdByUserId: test1UserId,
      createdAt: now,
      updatedAt: now
    },
    {
      name: 'Demo Lead 3 - Amit Kumar',
      phoneNumber: '9876543212',
      email: 'demo.amit@example.com',
      status: 'qualified',
      source: 'social_media',
      workshopName: 'Swaryoga Basic',
      notes: 'Ready to enroll',
      assignedToUserId: test1UserId,
      createdByUserId: test1UserId,
      createdAt: now,
      updatedAt: now
    },
    {
      name: 'Demo Lead 4 - Sneha Gupta',
      phoneNumber: '9876543213',
      email: 'demo.sneha@example.com',
      status: 'proposal_sent',
      source: 'website',
      workshopName: 'Kids Workshop',
      notes: 'Waiting for response',
      assignedToUserId: test1UserId,
      createdByUserId: test1UserId,
      createdAt: now,
      updatedAt: now
    },
    {
      name: 'Demo Lead 5 - Vikram Singh',
      phoneNumber: '9876543214',
      email: 'demo.vikram@example.com',
      status: 'won',
      source: 'referral',
      workshopName: 'Swaryoga Advanced',
      notes: 'Enrolled successfully!',
      assignedToUserId: test1UserId,
      createdByUserId: test1UserId,
      createdAt: now,
      updatedAt: now
    }
  ];
  
  // Delete existing demo leads for test1
  const deleteResult = await db.collection('leads').deleteMany({ 
    createdByUserId: test1UserId,
    name: { $regex: /^Demo Lead/ }
  });
  console.log('Deleted', deleteResult.deletedCount, 'existing demo leads');
  
  // Insert new demo leads
  const leadsResult = await db.collection('leads').insertMany(dummyLeads);
  console.log('✅ Created', leadsResult.insertedCount, 'demo leads');
  
  // Get inserted lead IDs for follow-ups
  const leadIds = Object.values(leadsResult.insertedIds);
  
  // 2. Add 2 demo templates
  const demoTemplates = [
    {
      templateName: 'demo_welcome_template',
      displayName: 'Demo Welcome Template',
      category: 'MARKETING',
      language: 'en',
      status: 'APPROVED',
      templateContent: 'Hello {{1}}! Welcome to Swaryoga. We are excited to have you join us for the {{2}} workshop.',
      components: [
        { type: 'BODY', text: 'Hello {{1}}! Welcome to Swaryoga. We are excited to have you join us for the {{2}} workshop.' }
      ],
      createdByUserId: test1UserId,
      createdAt: now,
      updatedAt: now
    },
    {
      templateName: 'demo_followup_template',
      displayName: 'Demo Follow-up Template',
      category: 'UTILITY',
      language: 'en',
      status: 'APPROVED',
      templateContent: 'Hi {{1}}, just checking in about your interest in our {{2}} program. Would you like to schedule a call?',
      components: [
        { type: 'BODY', text: 'Hi {{1}}, just checking in about your interest in our {{2}} program. Would you like to schedule a call?' }
      ],
      createdByUserId: test1UserId,
      createdAt: now,
      updatedAt: now
    }
  ];
  
  // Delete existing demo templates for test1
  await db.collection('whatsapp_templates').deleteMany({
    createdByUserId: test1UserId,
    templateName: { $regex: /^demo_/ }
  });
  
  // Insert demo templates
  const templatesResult = await db.collection('whatsapp_templates').insertMany(demoTemplates);
  console.log('✅ Created', templatesResult.insertedCount, 'demo templates');
  
  // 3. Add 2 demo follow-ups
  const demoFollowups = [
    {
      leadId: leadIds[1], // Demo Lead 2 - Priya Patel
      type: 'call',
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      notes: 'Demo: Call to discuss workshop options',
      status: 'pending',
      createdByUserId: test1UserId,
      assignedToUserId: test1UserId,
      createdAt: now,
      updatedAt: now
    },
    {
      leadId: leadIds[3], // Demo Lead 4 - Sneha Gupta
      type: 'whatsapp',
      scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
      notes: 'Demo: Send kids workshop details via WhatsApp',
      status: 'pending',
      createdByUserId: test1UserId,
      assignedToUserId: test1UserId,
      createdAt: now,
      updatedAt: now
    }
  ];
  
  // Delete existing demo follow-ups
  await db.collection('lead_followups').deleteMany({
    createdByUserId: test1UserId,
    notes: { $regex: /^Demo:/ }
  });
  
  // Insert demo follow-ups
  const followupsResult = await db.collection('lead_followups').insertMany(demoFollowups);
  console.log('✅ Created', followupsResult.insertedCount, 'demo follow-ups');
  
  // Summary
  console.log('\n📊 Demo data summary for test1@swaryoga.com:');
  console.log('   - 5 Leads (different statuses: new, contacted, qualified, proposal_sent, won)');
  console.log('   - 2 WhatsApp Templates (welcome + follow-up)');
  console.log('   - 2 Follow-up Tasks (call + whatsapp)');
  console.log('\n✅ All demo data is editable and deletable by the user.');
  
  await mongoose.disconnect();
  console.log('\nDone!');
}

addDemoData().catch(console.error);
