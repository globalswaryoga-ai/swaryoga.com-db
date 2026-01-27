/**
 * Script to import Youth Program Zoom recordings into community
 * 
 * Meeting ID: 833 7691 7306 (83376917306)
 * Topic: Youth Program
 * 
 * Run with: npx ts-node scripts/import-youth-recordings.ts
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
config({ path: '.env.local' });

const ZOOM_MEETING_ID = '83376917306';
const COMMUNITY_NAME = 'Youth Program Sadhak';

async function getZoomAccessToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Missing Zoom credentials');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get Zoom token: ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function listMeetingRecordings(meetingId: string, accessToken: string) {
  // First try to get past meeting instances
  const instancesUrl = `https://api.zoom.us/v2/past_meetings/${meetingId}/instances`;
  console.log(`\n📋 Fetching meeting instances from: ${instancesUrl}`);
  
  const instancesRes = await fetch(instancesUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!instancesRes.ok) {
    console.log(`⚠️ Could not get instances: ${instancesRes.status}`);
  } else {
    const instances = await instancesRes.json();
    console.log(`Found ${instances.meetings?.length || 0} meeting instances`);
    if (instances.meetings) {
      instances.meetings.forEach((m: any, i: number) => {
        console.log(`  ${i + 1}. ${m.start_time} - UUID: ${m.uuid}`);
      });
    }
  }

  // Get recordings for the meeting
  const recordingsUrl = `https://api.zoom.us/v2/meetings/${meetingId}/recordings`;
  console.log(`\n📹 Fetching recordings from: ${recordingsUrl}`);
  
  const recordingsRes = await fetch(recordingsUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!recordingsRes.ok) {
    const errorText = await recordingsRes.text();
    console.log(`⚠️ Error getting recordings: ${recordingsRes.status} - ${errorText}`);
    
    // Try user recordings endpoint
    console.log('\n🔄 Trying user recordings endpoint...');
    return await listUserRecordings(accessToken);
  }

  return await recordingsRes.json();
}

async function listUserRecordings(accessToken: string) {
  // Get recordings from the last 30 days for the account
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fromStr = from.toISOString().split('T')[0];
  const toStr = new Date().toISOString().split('T')[0];

  const url = `https://api.zoom.us/v2/users/me/recordings?from=${fromStr}&to=${toStr}`;
  console.log(`Fetching user recordings: ${url}`);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to get user recordings: ${await res.text()}`);
  }

  const data = await res.json();
  console.log(`\nFound ${data.total_records || 0} total recordings`);
  
  // Filter for Youth Program
  const youthRecordings = data.meetings?.filter((m: any) => 
    m.topic?.toLowerCase().includes('youth') || 
    m.id?.toString() === ZOOM_MEETING_ID
  ) || [];

  console.log(`\n🎯 Youth Program recordings: ${youthRecordings.length}`);
  
  return { meetings: youthRecordings };
}

async function main() {
  console.log('='.repeat(60));
  console.log('🧘 Youth Program Recordings Import Tool');
  console.log('='.repeat(60));
  console.log(`\nMeeting ID: ${ZOOM_MEETING_ID}`);
  console.log(`Community: ${COMMUNITY_NAME}`);

  try {
    // Get Zoom token
    console.log('\n🔑 Getting Zoom access token...');
    const accessToken = await getZoomAccessToken();
    console.log('✅ Got access token');

    // List recordings
    const data = await listMeetingRecordings(ZOOM_MEETING_ID, accessToken);
    
    if (data.meetings && data.meetings.length > 0) {
      console.log('\n📹 RECORDINGS FOUND:');
      console.log('-'.repeat(50));
      
      data.meetings.forEach((meeting: any, index: number) => {
        console.log(`\n${index + 1}. ${meeting.topic}`);
        console.log(`   Date: ${meeting.start_time}`);
        console.log(`   Duration: ${meeting.duration} minutes`);
        console.log(`   Files: ${meeting.recording_files?.length || 0}`);
        
        if (meeting.recording_files) {
          meeting.recording_files.forEach((file: any) => {
            const sizeMB = (file.file_size / 1024 / 1024).toFixed(1);
            console.log(`     - ${file.recording_type} (${file.file_type}) - ${sizeMB} MB`);
          });
        }
      });
    } else if (data.recording_files) {
      // Single meeting response
      console.log('\n📹 RECORDING FILES:');
      console.log('-'.repeat(50));
      console.log(`Topic: ${data.topic}`);
      console.log(`Date: ${data.start_time}`);
      console.log(`Duration: ${data.duration} minutes`);
      console.log(`Total files: ${data.recording_files.length}`);
      
      data.recording_files.forEach((file: any, i: number) => {
        const sizeMB = (file.file_size / 1024 / 1024).toFixed(1);
        console.log(`\n${i + 1}. ${file.recording_type}`);
        console.log(`   Type: ${file.file_type}`);
        console.log(`   Size: ${sizeMB} MB`);
        console.log(`   Status: ${file.status}`);
      });
    } else {
      console.log('\n⚠️ No recordings found for this meeting');
      console.log('Raw response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  }

  console.log('\n' + '='.repeat(60));
}

main();
