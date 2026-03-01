#!/usr/bin/env node
/**
 * Backfill stuck AI call logs by fetching actual data from Retell API
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const RETELL_API_BASE = 'https://api.retellai.com';

async function retellFetch(path) {
  const res = await fetch(`${RETELL_API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Retell ${res.status}: ${err}`);
  }
  return res.json();
}

function mapStatus(callStatus, disconnectionReason) {
  let status = 'completed';
  
  if (callStatus === 'error') status = 'failed';
  else if (callStatus === 'not_connected') status = 'failed';
  else if (callStatus === 'ended') status = 'completed';
  else if (callStatus === 'ongoing') status = 'in_progress';
  else if (callStatus === 'registered') status = 'queued';
  
  // Override based on disconnection reason
  if (disconnectionReason) {
    if (disconnectionReason === 'dial_no_answer') status = 'no_answer';
    else if (disconnectionReason === 'dial_busy') status = 'busy';
    else if (disconnectionReason === 'dial_failed') status = 'failed';
    else if (disconnectionReason === 'registered_call_timeout') status = 'failed';
    else if (disconnectionReason.startsWith('error_')) status = 'failed';
  }
  
  return status;
}

const reasonMap = {
  user_hangup: 'Lead hung up',
  agent_hangup: 'AI agent completed',
  call_transfer: 'Transferred',
  inactivity: 'No response / silence',
  machine_detected: 'Voicemail detected',
  voicemail_reached: 'Voicemail reached',
  max_duration_reached: 'Max duration reached',
  concurrency_limit_reached: 'System busy',
  dial_busy: 'Line busy',
  dial_failed: 'Call failed to connect',
  dial_no_answer: 'No answer',
  registered_call_timeout: 'Timeout',
};

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  const collection = db.collection('aicalllogs');
  
  // Find all stuck calls
  const stuckCalls = await collection.find({
    status: { $in: ['ringing', 'queued'] },
    retellCallId: { $exists: true, $ne: null },
  }).sort({ createdAt: -1 }).toArray();
  
  console.log(`Found ${stuckCalls.length} stuck calls to sync\n`);
  
  let synced = 0;
  let failed = 0;
  
  for (const callLog of stuckCalls) {
    try {
      const call = await retellFetch(`/v2/get-call/${callLog.retellCallId}`);
      
      const status = mapStatus(call.call_status, call.disconnection_reason);
      const update = { status };
      
      // Duration
      if (call.start_timestamp && call.end_timestamp) {
        update.duration = Math.round((call.end_timestamp - call.start_timestamp) / 1000);
        update.startedAt = new Date(call.start_timestamp);
        update.endedAt = new Date(call.end_timestamp);
      }
      
      // Transcript
      if (call.transcript) {
        update.transcript = call.transcript;
      } else if (call.transcript_object) {
        update.transcript = call.transcript_object
          .map(t => `${t.role === 'agent' ? 'AI' : 'Lead'}: ${t.content}`)
          .join('\n');
      }
      
      // Recording
      if (call.recording_url) update.recordingUrl = call.recording_url;
      
      // Disconnection reason
      if (call.disconnection_reason) {
        update.callEndedReason = reasonMap[call.disconnection_reason] || call.disconnection_reason;
      }
      
      // From number
      if (call.from_number) update.fromNumber = call.from_number;
      
      // AI analysis
      if (call.call_analysis) {
        if (call.call_analysis.call_summary) update.summary = call.call_analysis.call_summary;
        if (call.call_analysis.user_sentiment) {
          const sm = { Positive: 'positive', Negative: 'negative', Neutral: 'neutral', Unknown: '' };
          update.sentiment = sm[call.call_analysis.user_sentiment] || '';
        }
        if (call.call_analysis.custom_analysis_data) {
          update.collectedData = call.call_analysis.custom_analysis_data;
        }
      }
      
      await collection.updateOne({ _id: callLog._id }, { $set: update });
      
      const durStr = update.duration ? `${Math.floor(update.duration / 60)}m${update.duration % 60}s` : '0s';
      console.log(`✅ ${callLog.retellCallId} | ${callLog.status} → ${status} | ${durStr} | ${update.callEndedReason || 'N/A'}`);
      synced++;
      
      // Rate limit
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.log(`❌ ${callLog.retellCallId} | Error: ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Synced: ${synced}/${stuckCalls.length}`);
  if (failed > 0) console.log(`Failed: ${failed}`);
  
  // Verify
  const verify = await collection.find({}).sort({createdAt: -1}).limit(10).toArray();
  console.log('\n=== Current Call Status ===');
  for (const c of verify) {
    const dur = c.duration ? `${Math.floor(c.duration / 60)}m${c.duration % 60}s` : '0s';
    console.log(`${c.status.padEnd(12)} | ${dur.padEnd(6)} | ${c.phoneNumber} | ${c.callEndedReason || ''} | ${c.purpose}`);
  }
  
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
