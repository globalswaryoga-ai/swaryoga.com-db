#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  
  // Get recent broadcast runs
  const runs = await db.collection('broadcast_runs').find({}).sort({ createdAt: -1 }).limit(3).toArray();
  
  console.log('Recent Broadcast Runs:');
  runs.forEach(r => {
    console.log('---');
    console.log('ID:', r._id);
    console.log('Name:', r.name);
    console.log('Status:', r.status);
    console.log('Provider:', r.provider);
    console.log('ScheduleAt:', r.scheduleAt);
    console.log('StartedAt:', r.startedAt);
    console.log('TotalRecipients:', r.totalRecipients);
    console.log('SentCount:', r.sentCount);
    console.log('FailedCount:', r.failedCount);
    console.log('CreatedAt:', r.createdAt);
  });
  
  // Check scheduled jobs
  const jobs = await db.collection('whatsapp_scheduled_jobs').find({ status: { $in: ['pending', 'scheduled'] } }).sort({ scheduledFor: 1 }).limit(5).toArray();
  console.log('\nPending Scheduled Jobs:', jobs.length);
  jobs.forEach(j => {
    console.log('---');
    console.log('JobID:', j._id);
    console.log('Status:', j.status);
    console.log('ScheduledFor:', j.scheduledFor);
    console.log('BroadcastRunId:', j.broadcastRunId);
  });
  
  await client.close();
}
check().catch(console.error);
