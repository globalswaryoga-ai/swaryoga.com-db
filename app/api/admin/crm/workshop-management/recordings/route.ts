import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getWorkshopRecordingDelivery } from '@/lib/schemas/workshopStudentManagementSchemas';

function isAdmin(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  return verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw)?.isAdmin;
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  if (!body.cohortId || !body.classDate) return NextResponse.json({ error: 'cohortId and classDate are required' }, { status: 400 });
  await connectDB();

  const deliveredStudentIds = Array.isArray(body.deliveredStudentIds)
    ? body.deliveredStudentIds.filter(Boolean)
    : typeof body.deliveredStudentIds === 'string'
      ? body.deliveredStudentIds.split(',').map((id: string) => id.trim()).filter(Boolean)
      : [];

  const Recording = getWorkshopRecordingDelivery();
  const recording = await Recording.findOneAndUpdate(
    { cohortId: body.cohortId, classDate: new Date(body.classDate) },
    { $set: {
        cohortId: body.cohortId,
        classDate: new Date(body.classDate),
        dayNumber: body.dayNumber || undefined,
        zoomMeetingId: body.zoomMeetingId || undefined,
        zoomMeetingUuid: body.zoomMeetingUuid || undefined,
        youtubeSpeakerId: body.youtubeSpeakerId || undefined,
        youtubeGalleryId: body.youtubeGalleryId || undefined,
        youtubeSpeakerUrl: body.youtubeSpeakerUrl || (body.youtubeSpeakerId ? `https://youtu.be/${body.youtubeSpeakerId}` : undefined),
        youtubeGalleryUrl: body.youtubeGalleryUrl || (body.youtubeGalleryId ? `https://youtu.be/${body.youtubeGalleryId}` : undefined),
        bunnySpeakerUrl: body.bunnySpeakerUrl || undefined,
        bunnyGalleryUrl: body.bunnyGalleryUrl || undefined,
        deliveredStudentIds,
      } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return NextResponse.json({ recording });
}
