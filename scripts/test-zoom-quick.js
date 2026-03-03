#!/usr/bin/env node
/**
 * Quick test of the full analytics pipeline
 */
require('dotenv').config({ path: '.env.local' });

async function test() {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  // Get access token
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  const { access_token } = await tokenRes.json();

  // Test with recent session - the March 2 evening batch
  const meetingId = '88246689132';
  
  // Get instances
  const instRes = await fetch(`https://api.zoom.us/v2/past_meetings/${meetingId}/instances`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const instData = await instRes.json();
  const meetings = instData.meetings || [];
  console.log(`Total instances: ${meetings.length}`);
  
  // Get the most recent one (March 3 if available, or March 2)
  meetings.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
  const recent = meetings[0];
  console.log(`Most recent: ${recent.uuid} at ${recent.start_time}`);

  // Get report for this instance 
  const reportRes = await fetch(`https://api.zoom.us/v2/report/meetings/${encodeURIComponent(encodeURIComponent(recent.uuid))}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const report = await reportRes.json();
  console.log(`\nMeeting: ${report.topic}`);
  console.log(`Duration: ${report.duration} min`);
  console.log(`Participants: ${report.participants_count}`);

  // Get participants
  const partRes = await fetch(`https://api.zoom.us/v2/report/meetings/${encodeURIComponent(encodeURIComponent(recent.uuid))}/participants?page_size=50`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const partData = await partRes.json();
  
  console.log(`\n=== Participants (${partData.total_records}) ===`);
  for (const p of (partData.participants || [])) {
    const durationMin = Math.round(p.duration / 60);
    const pct = report.duration > 0 ? Math.min(100, Math.round((p.duration / (report.duration * 60)) * 100)) : 0;
    let grade = 'E';
    if (pct >= 90) grade = 'A';
    else if (pct >= 70) grade = 'B';
    else if (pct >= 50) grade = 'C';
    else if (pct >= 30) grade = 'D';
    
    console.log(`  [${grade}] ${p.name.padEnd(25)} ${durationMin}min  ${pct}%  ${p.user_email || '—'}`);
  }
}

test().catch(console.error);
