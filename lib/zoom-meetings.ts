/**
 * Zoom Meeting Management Utility
 * Creates Zoom meetings programmatically for workshops
 */

import { getZoomAccessToken } from './zoom-s3-sync';

interface CreateMeetingOptions {
  topic: string;
  startTime: Date;
  duration: number; // in minutes
  timezone?: string;
  agenda?: string;
  autoRecording?: 'local' | 'cloud' | 'none';
}

interface ZoomMeetingResponse {
  id: number;
  uuid: string;
  host_id: string;
  host_email: string;
  topic: string;
  start_time: string;
  duration: number;
  timezone: string;
  join_url: string;
  password: string;
  start_url: string;
}

/**
 * Create a Zoom meeting
 */
export async function createZoomMeeting(
  options: CreateMeetingOptions
): Promise<ZoomMeetingResponse> {
  const accessToken = await getZoomAccessToken();

  const meetingData = {
    topic: options.topic,
    type: 2, // Scheduled meeting
    start_time: options.startTime.toISOString(),
    duration: options.duration,
    timezone: options.timezone || 'Asia/Kolkata',
    agenda: options.agenda || '',
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      mute_upon_entry: true,
      waiting_room: true,
      auto_recording: options.autoRecording || 'cloud', // Auto cloud recording!
      meeting_authentication: false,
    },
  };

  const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(meetingData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Zoom meeting: ${error}`);
  }

  return response.json();
}

/**
 * Get meeting details
 */
export async function getZoomMeeting(meetingId: number | string): Promise<ZoomMeetingResponse> {
  const accessToken = await getZoomAccessToken();

  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get meeting: ${error}`);
  }

  return response.json();
}

/**
 * Delete a Zoom meeting
 */
export async function deleteZoomMeeting(meetingId: number | string): Promise<void> {
  const accessToken = await getZoomAccessToken();

  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.text();
    throw new Error(`Failed to delete meeting: ${error}`);
  }
}

/**
 * Update a Zoom meeting
 */
export async function updateZoomMeeting(
  meetingId: number | string,
  options: Partial<CreateMeetingOptions>
): Promise<void> {
  const accessToken = await getZoomAccessToken();

  const updateData: any = {};
  if (options.topic) updateData.topic = options.topic;
  if (options.startTime) updateData.start_time = options.startTime.toISOString();
  if (options.duration) updateData.duration = options.duration;
  if (options.agenda) updateData.agenda = options.agenda;

  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.text();
    throw new Error(`Failed to update meeting: ${error}`);
  }
}

/**
 * List upcoming meetings
 */
export async function listZoomMeetings(): Promise<ZoomMeetingResponse[]> {
  const accessToken = await getZoomAccessToken();

  const response = await fetch('https://api.zoom.us/v2/users/me/meetings?type=upcoming', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list meetings: ${error}`);
  }

  const data = await response.json();
  return data.meetings || [];
}
