require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const crmUri = process.env.MONGODB_URI_MAIN.replace(
  process.env.MONGODB_DB_NAME || 'swaryogaDB',
  process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm'
);

async function testSend() {
  try {
    await mongoose.connect(crmUri, { serverSelectionTimeoutMS: 10000 });
    const db = mongoose.connection.db;
    
    // Get first 3 leads for testing
    const leads = await db.collection('leads').find({}).limit(3).toArray();
    console.log(`📤 Sending test broadcast to ${leads.length} leads...\n`);
    
    const token = jwt.sign({ userId: 'admin', isAdmin: true }, process.env.JWT_SECRET || 'test-secret');
    const videoUrl = 'https://player.mediadelivery.net/play/638748/da4f8bdd-0e41-4b2a-a34c-c911074fb48';
    const zoomLink = 'https://us06web.zoom.us/j/84851713697?pwd=mC4oPTd5Dx5UmmT6J1vk19KqOnXro8.1';
    
    let sent = 0;
    for (const lead of leads) {
      try {
        const message = `🧘 *Sadhana Video - 6:30 PM*\n\n🎥 Watch: ${videoUrl}\n\n📹 Zoom: ${zoomLink}\n\nJoin us now!`;

        const response = await axios.post('https://crm.swaryoga.com/api/admin/crm/whatsapp/send', 
          {
            phone: lead.phone,
            message: message,
            type: 'text'
          },
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        
        console.log(`✅ Sent to: ${lead.phone}`);
        sent++;
      } catch (e) {
        console.log(`⚠️  Failed for ${lead.phone}: ${e.message}`);
      }
    }
    
    console.log(`\n✅ Successfully sent: ${sent}/${leads.length}`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

testSend();
