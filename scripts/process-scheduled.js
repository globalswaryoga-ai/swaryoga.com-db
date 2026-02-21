require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function main() {
  console.log('Connecting to DB...');
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  
  console.log('Processing scheduled broadcasts at:', new Date().toISOString());
  
  // Check scheduled runs
  const runs = await mongoose.connection.db.collection('broadcastruns').find({
    status: 'scheduled',
    scheduledAt: { $lte: new Date() }
  }).toArray();
  
  console.log('Found', runs.length, 'due scheduled runs');
  
  for (const run of runs) {
    console.log('\n--- Processing run:', run._id.toString());
    console.log('Name:', run.name);
    console.log('Recipients:', run.recipients?.length || 0);
    console.log('Scheduled for:', run.scheduledAt);
    
    // Get recipient phones
    const recipients = run.recipients || [];
    if (recipients.length === 0) {
      console.log('No recipients, skipping');
      continue;
    }
    
    // Get template info from snapshot
    const snapshot = run.templateSnapshot;
    if (!snapshot || !snapshot.templateName) {
      console.log('No template snapshot found');
      continue;
    }
    
    console.log('Template:', snapshot.templateName);
    console.log('Header Format:', snapshot.headerFormat);
    
    // Send to each recipient using Meta API
    const results = [];
    for (const phone of recipients) {
      console.log('Sending to:', phone);
      
      try {
        const response = await sendTemplate(phone, snapshot);
        results.push({ phone, success: true, response });
        console.log('  ✓ Sent:', response.messages?.[0]?.id);
      } catch (err) {
        results.push({ phone, success: false, error: err.message });
        console.log('  ✗ Failed:', err.message);
      }
    }
    
    // Update run status
    const successCount = results.filter(r => r.success).length;
    await mongoose.connection.db.collection('broadcastruns').updateOne(
      { _id: run._id },
      { 
        $set: { 
          status: 'completed',
          completedAt: new Date(),
          'stats.sent': successCount,
          'stats.failed': results.length - successCount,
          'stats.pending': 0
        }
      }
    );
    console.log('Updated run status: completed');
  }
  
  await mongoose.disconnect();
  console.log('\nDone!');
}

async function sendTemplate(phone, snapshot) {
  const crypto = require('crypto');
  
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const appSecret = process.env.META_APP_SECRET;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  const appsecret_proof = crypto
    .createHmac('sha256', appSecret)
    .update(accessToken)
    .digest('hex');
  
  // Build components for IMAGE header
  const components = [];
  
  // Check if template needs IMAGE header
  if (snapshot.headerFormat === 'IMAGE' && snapshot.headerMedia?.url) {
    components.push({
      type: 'header',
      parameters: [{
        type: 'image',
        image: { link: snapshot.headerMedia.url }
      }]
    });
  }
  
  const body = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: snapshot.templateName,
      language: { code: snapshot.language || 'hi' }
    }
  };
  
  if (components.length > 0) {
    body.template.components = components;
  }
  
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages?appsecret_proof=${appsecret_proof}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error?.message || JSON.stringify(data));
  }
  
  return data;
}

main();
