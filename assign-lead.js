require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const crmUri = process.env.MONGODB_URI_MAIN.replace(
  process.env.MONGODB_DB_NAME || 'swaryogaDB',
  process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm'
);

(async () => {
  try {
    await mongoose.connect(crmUri);
    const db = mongoose.connection.db;
    
    // Get admin ID
    const admin = await db.collection('admin_users').findOne({ email: 'swarsakshi9999@gmail.com' });
    const adminId = admin._id.toString();
    console.log('👤 Admin ID:', adminId);
    
    // Assign leads
    const result = await db.collection('leads').updateMany(
      {},
      { $set: { assignedToUserId: adminId, updatedAt: new Date() } },
      { limit: 10 }
    );
    
    console.log('✅ Updated', result.modifiedCount, 'leads');
    
    const assigned = await db.collection('leads').countDocuments({ assignedToUserId: adminId });
    console.log('📊 Total leads assigned to you:', assigned);
    
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
