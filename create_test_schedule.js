const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority';

async function create() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    const db = mongoose.connection.getClient().db('swaryoga_admin_crm');
    const collection = db.collection('qr_broadcast_schedules');
    
    // Create a new test schedule for NOW
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const currentHour = String(istTime.getHours()).padStart(2, '0');
    const currentMin = String(istTime.getMinutes()).padStart(2, '0');
    
    // Set time window to include current time
    const startTime = `${String(Math.max(0, istTime.getHours() - 1)).padStart(2, '0')}:00`;
    const endTime = `${String(Math.min(23, istTime.getHours() + 1)).padStart(2, '0')}:59`;
    
    const schedule = await collection.insertOne({
      userId: 'admin',
      tenantId: 'default',
      name: `Test Broadcast - ${now.toLocaleString()}`,
      messageText: 'Test message for statistics - यह परीक्षण संदेश है',
      mediaUrls: [],
      recipientChatIds: ['919309986820@c.us'],
      totalRecipients: 1,
      groupIds: [],
      individualIds: [],
      isActive: true,
      startTime,
      endTime,
      timezone: 'Asia/Kolkata',
      frequency: 'once',
      daysOfWeek: [],
      customScheduleDates: [],
      maxMessagesPerDay: 300,
      gapStrategy: {
        preset: 'SAFE',
        initialGapMs: 7000,
        initialGapCount: 2,
        minGapMs: 45000,
        maxGapMs: 120000,
        ensureVariation: true,
        ensureJitter: true,
        jitterPercent: 15,
      },
      randomization: {
        enabled: true,
        shuffleRecipients: true,
        randomizeTimings: true,
        jitterPercent: 15,
      },
      status: 'scheduled',
      createdBy: 'admin',
      description: 'Test schedule for statistics verification',
      tags: ['test'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('Created test schedule:');
    console.log('  ID:', schedule.insertedId);
    console.log('  Name:', schedule.insertedId ? 'Test Broadcast' : 'Failed');
    console.log('  Status: scheduled');
    console.log('  Recipients: 1');
    console.log('  Time window: ' + startTime + ' - ' + endTime);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

create();
