import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getWorkshopCohort, getWorkshopStudent, getWorkshopAttendance, getWorkshopRecordingDelivery } from '@/lib/schemas/workshopStudentManagementSchemas';

export const dynamic = 'force-dynamic';

function admin(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
  return verifyToken(token);
}

async function syncUploadedRecordings(cohort: any, Recording: any) {
  if (!cohort?.zoomMeetingId) return;
  const Accounts = mongoose.connection.db.collection('socialmediaaccounts');
  const youtube = await Accounts.findOne({ platform: 'youtube' }, { projection: { 'metadata.uploadedMeetings': 1 } });
  const uploads = youtube?.metadata?.uploadedMeetings || [];
  const start = new Date(cohort.startDate);
  const end = cohort.endDate ? new Date(cohort.endDate) : new Date(start.getTime() + 14 * 86400000);
  const holidays = new Set((cohort.holidayDates || []).map((date: Date | string) => new Date(date).toISOString().slice(0, 10)));
  const classDay = (date: Date) => {
    let day = 0;
    for (let cursor = new Date(start); cursor <= date; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const key = cursor.toISOString().slice(0, 10);
      if (cursor.getUTCDay() !== 0 && !holidays.has(key)) day++;
    }
    return day;
  };

  for (const upload of uploads) {
    if (String(upload.zoomMeetingId || '') !== String(cohort.zoomMeetingId)) continue;
    const classDate = new Date(upload.startTime);
    if (Number.isNaN(classDate.getTime()) || classDate < start || classDate > end) continue;
    const speakerId = upload.youtube?.speaker || upload.youtubeUrls?.speaker;
    const galleryId = upload.youtube?.gallery || upload.youtubeUrls?.gallery;
    const extractYoutubeId = (value: unknown) => {
      const text = String(value || '');
      const match = text.match(/(?:youtu\.be\/|[?&]v=|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
      return match?.[1] || (/^[A-Za-z0-9_-]{11}$/.test(text) ? text : undefined);
    };
    const normalizedSpeakerId = extractYoutubeId(speakerId);
    const normalizedGalleryId = extractYoutubeId(galleryId);
    if (!speakerId && !galleryId) continue;
    const bunnyUrl = (value: unknown) => {
      const text = String(value || '');
      return text.startsWith('http://') || text.startsWith('https://')
        ? text
        : `https://${process.env.BUNNY_STORAGE_CDN_HOST || 'swaryogacrm.b-cdn.net'}/${text}`;
    };
    await Recording.findOneAndUpdate(
      { cohortId: cohort._id, classDate: new Date(classDate.toISOString().slice(0, 10)) },
      { $set: {
        cohortId: cohort._id,
        classDate: new Date(classDate.toISOString().slice(0, 10)),
        dayNumber: classDay(classDate),
        zoomMeetingId: String(upload.zoomMeetingId),
        zoomMeetingUuid: upload.uuid,
        ...(normalizedSpeakerId ? { youtubeSpeakerId: normalizedSpeakerId, youtubeSpeakerUrl: upload.youtubeUrls?.speaker || `https://youtu.be/${normalizedSpeakerId}` } : {}),
        ...(normalizedGalleryId ? { youtubeGalleryId: normalizedGalleryId, youtubeGalleryUrl: upload.youtubeUrls?.gallery || `https://youtu.be/${normalizedGalleryId}` } : {}),
        ...(upload.bunny?.speaker ? { bunnySpeakerUrl: bunnyUrl(upload.bunny.speaker) } : {}),
        ...(upload.bunny?.gallery ? { bunnyGalleryUrl: bunnyUrl(upload.bunny.gallery) } : {}),
      } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
}

export async function GET(request: NextRequest) {
  const decoded = admin(request);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  await connectDB();
  const cohortId = request.nextUrl.searchParams.get('cohortId');
  const Cohort = getWorkshopCohort();
  const Student = getWorkshopStudent();
  const Attendance = getWorkshopAttendance();
  const Recording = getWorkshopRecordingDelivery();
  if (cohortId) {
    const cohortData = await Cohort.findById(cohortId).lean();
    await syncUploadedRecordings(cohortData, Recording);
    const [cohort, students, attendance, recordings] = await Promise.all([
      Promise.resolve(cohortData),
      Student.find({ cohortId }).sort({ name: 1 }).lean(),
      Attendance.find({ cohortId }).sort({ classDate: -1 }).lean(),
      Recording.find({ cohortId }).sort({ classDate: -1 }).lean(),
    ]);
    return NextResponse.json({ cohort, students, attendance, recordings });
  }
  const cohorts = await Cohort.find().sort({ startDate: -1 }).lean();
  return NextResponse.json({ cohorts });
}

export async function POST(request: NextRequest) {
  const decoded = admin(request);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  await connectDB();
  const Cohort = getWorkshopCohort();
  const cohort = await Cohort.create({
    name: String(body.name || '').trim(),
    startDate: body.startDate,
    endDate: body.endDate || undefined,
    holidayDates: Array.isArray(body.holidayDates) ? body.holidayDates : [],
    classStartTime: body.classStartTime || undefined,
    classEndTime: body.classEndTime || undefined,
    timezone: body.timezone || 'Asia/Kolkata',
    zoomMeetingId: body.zoomMeetingId || undefined,
    zoomJoinUrl: body.zoomJoinUrl || undefined,
    whatsappGroupLink: body.whatsappGroupLink || undefined,
    googleFormLink: body.googleFormLink || undefined,
    aiWorkerEnabled: body.aiWorkerEnabled !== false,
    autoSendRecordings: body.autoSendRecordings === true,
    whatsappGroupId: body.whatsappGroupId || undefined,
    communityId: body.communityId || undefined,
    createdByUserId: decoded.userId,
  });
  return NextResponse.json({ cohort }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const decoded = admin(request);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  if (!body.cohortId) return NextResponse.json({ error: 'cohortId is required' }, { status: 400 });
  const googleFormLink = String(body.googleFormLink || '').trim();
  if (googleFormLink && !/^https?:\/\//i.test(googleFormLink)) {
    return NextResponse.json({ error: 'Google Forms link must start with http:// or https://' }, { status: 400 });
  }
  await connectDB();
  const cohort = await getWorkshopCohort().findByIdAndUpdate(
    body.cohortId,
    { $set: { googleFormLink: googleFormLink || undefined } },
    { new: true },
  ).lean();
  if (!cohort) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
  return NextResponse.json({ cohort });
}
