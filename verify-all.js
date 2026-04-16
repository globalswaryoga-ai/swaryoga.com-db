const mongoose = require('mongoose');
require('dotenv').config();

async function verify() {
  try {
    console.log('\n🔍 SADHANA + ZOOM WEBHOOK VERIFICATION\n');
    console.log('=' .repeat(70));

    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI_MAIN);
    console.log('✅ MongoDB Connected');

    // 2. Check Sadhana Schedule
    const db = mongoose.connection.db;
    const schedules = await db.collection('sadhana_schedules').find({ status: 'active' }).toArray();
    console.log(`\n📅 SADHANA SCHEDULER:`);
    console.log(`   Active Schedules: ${schedules.length}`);
    if (schedules.length > 0) {
      const sched = schedules[0];
      console.log(`   - Name: ${sched.name}`);
      console.log(`   - Video: ${sched.videoUrl ? '✅' : '❌'}`);
      console.log(`   - Zoom ID: ${sched.zoomId ? '✅' : '❌'}`);
      console.log(`   - Times: ${JSON.stringify(sched.schedule?.times || []).substring(0, 50)}...`);
    }

    // 3. Check Leads Assigned
    const leads = await db.collection('leads').countDocuments({ assignedToUserId: 'admin' });
    console.log(`\n👥 LEADS ASSIGNED:`);
    console.log(`   To Admin: ${leads} leads`);

    // 4. Check Zoom Config
    const hasZoomSecret = !!process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
    const hasZoomCreds = !!process.env.ZOOM_CLIENT_ID && !!process.env.ZOOM_CLIENT_SECRET;
    console.log(`\n🔐 ZOOM CONFIGURATION:`);
    console.log(`   ${hasZoomSecret ? '✅' : '❌'} Webhook Secret Token`);
    console.log(`   ${hasZoomCreds ? '✅' : '❌'} Client ID & Secret`);
    console.log(`   ${process.env.ZOOM_ACCOUNT_ID ? '✅' : '❌'} Account ID`);

    // 5. Check Cron Job Config
    console.log(`\n⏰ CRON JOB:`);
    const fs = require('fs');
    const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    const sadhanaJob = vercel.crons?.find(c => c.path.includes('sadhana-scheduler'));
    console.log(`   ${sadhanaJob ? '✅' : '❌'} Sadhana Scheduler Cron`);
    if (sadhanaJob) console.log(`   Schedule: ${sadhanaJob.schedule}`);

    // 6. Check Webhook File
    console.log(`\n📡 WEBHOOK ENDPOINT:`);
    const webhookExists = fs.existsSync('app/api/zoom/webhook/route.ts');
    console.log(`   ${webhookExists ? '✅' : '❌'} /api/zoom/webhook exists`);

    // 7. Check Meeting.started Handler
    if (webhookExists) {
      const webhookCode = fs.readFileSync('app/api/zoom/webhook/route.ts', 'utf8');
      const hasMeetingStarted = webhookCode.includes('meeting.started');
      const hasURL = webhookCode.includes('handleMeetingStarted');
      console.log(`   ${hasMeetingStarted ? '✅' : '❌'} Handles meeting.started`);
      console.log(`   ${hasURL ? '✅' : '❌'} Video auto-post handler`);
    }

    // 8. Database collections
    console.log(`\n📊 DATABASE COLLECTIONS:`);
    const collections = ['sadhana_schedules', 'zoom_meeting_events', 'leads', 'crm_user_settings'];
    for (const col of collections) {
      const count = await db.collection(col).countDocuments();
      console.log(`   ${col}: ${count} documents`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ FULL SYSTEM CHECK COMPLETE\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verify();
