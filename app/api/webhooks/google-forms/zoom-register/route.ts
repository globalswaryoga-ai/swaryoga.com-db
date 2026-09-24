import { NextRequest, NextResponse } from 'next/server';
import { addZoomMeetingRegistrant } from '@/lib/zoom-meetings';
import { uploadToPath } from '@/lib/bunny-storage';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const meetingId = data.meetingId;
    const email = data.email;
    const firstName = data.firstName;
    const lastName = data.lastName || '';
    const phone = data.phone || '';

    if (!meetingId || !email || !firstName) {
      return NextResponse.json(
        { error: 'Missing required fields (meetingId, email, firstName)' },
        { status: 400 }
      );
    }

    // 1. Add registrant to Zoom
    const zoomResponse = await addZoomMeetingRegistrant(meetingId, {
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
    });

    // 2. Save registration data to Bunny Storage instead of MongoDB
    const timestamp = Date.now();
    const cleanEmail = email.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `zoom-registrations/${meetingId}/${timestamp}_${cleanEmail}.json`;

    const fileBuffer = Buffer.from(JSON.stringify({
      ...data,
      zoomResponse,
      registeredAt: new Date().toISOString(),
    }, null, 2), 'utf-8');

    const storageUrl = await uploadToPath(fileBuffer, storageKey, 'application/json');

    return NextResponse.json({
      success: true,
      zoomJoinUrl: zoomResponse.join_url,
      storageUrl,
    });
  } catch (error: any) {
    console.error('Google Form to Zoom Webhook Error:', error);
    return NextResponse.json(
      { error: 'Failed to process registration', details: error.message },
      { status: 500 }
    );
  }
}
