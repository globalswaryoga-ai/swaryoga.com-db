import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { getWorkshopCohort, getWorkshopRecordingDelivery, getWorkshopStudent } from '@/lib/schemas/workshopStudentManagementSchemas';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';
import { syncWorkshopZoomAttendance } from '@/lib/workshop-zoom-attendance';

function auth(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  return verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw);
}

function phoneOf(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits : '';
}

export async function POST(request: NextRequest) {
  const decoded: any = auth(request);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const { cohortId, dryRun = false } = await request.json();
  if (!cohortId) return NextResponse.json({ error: 'cohortId is required' }, { status: 400 });

  await connectDB();
  const Cohort = getWorkshopCohort();
  const Student = getWorkshopStudent();
  const Recording = getWorkshopRecordingDelivery();
  const cohort: any = await Cohort.findById(cohortId).lean();
  if (!cohort) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
  if (cohort.createdByUserId && String(cohort.createdByUserId) !== String(decoded.userId) && !decoded.isSuperAdmin) {
    return NextResponse.json({ error: 'This workshop belongs to another admin' }, { status: 403 });
  }

  const students: any[] = await Student.find({ cohortId, active: true }).lean();
  const recordings: any[] = await Recording.find({ cohortId }).sort({ classDate: 1 }).lean();
  const result: any = { worker: 'workshop-management', dryRun, studentsChecked: students.length, recordingsChecked: recordings.length, sent: 0, skipped: 0, failed: 0, errors: [] as string[] };
  // Attendance is independent of recording delivery. Run it first so the same
  // AI worker button also refreshes daily Zoom attendance.
  if (cohort.zoomMeetingId) {
    try {
      result.zoomAttendance = await syncWorkshopZoomAttendance(String(cohort._id));
    } catch (error) {
      result.zoomAttendance = { updated: 0, message: error instanceof Error ? error.message : 'Zoom attendance sync failed' };
    }
  }
  if (!cohort.aiWorkerEnabled) return NextResponse.json({ success: true, result: { ...result, skipped: recordings.length, message: 'Recording worker is disabled; Zoom attendance sync was still attempted.' } });
  if (!cohort.autoSendRecordings) return NextResponse.json({ success: true, result: { ...result, skipped: recordings.length, message: 'Automatic recording delivery is disabled.' } });

  const settings: any = await getCRMUserSettings().findOne({ userId: cohort.createdByUserId || decoded.userId }).lean();
  const bridge = getWhatsAppBridgeConfig();
  const sessionKey = settings?.permanentTenantId || cohort.createdByUserId || decoded.userId;
  const deliveredByStudent = new Map<string, any[]>();
  for (const recording of recordings) {
    const delivered = new Set((recording.deliveredStudentIds || []).map((id: any) => String(id)));
    for (const student of students) {
      if (delivered.has(String(student._id))) { result.skipped++; continue; }
      const phone = phoneOf(student.whatsappNumber || student.phone);
      if (!phone) { result.skipped++; continue; }
      const links = [recording.youtubeSpeakerUrl, recording.youtubeGalleryUrl, recording.bunnySpeakerUrl, recording.bunnyGalleryUrl].filter(Boolean);
      if (!links.length) { result.skipped++; continue; }
      const message = `Workshop ${cohort.name} — Day ${recording.dayNumber || ''}\n\nYour class recording is ready:\n${links.join('\n')}`;
      if (dryRun) { result.sent++; continue; }
      try {
        const response = await fetch(`${bridge.url}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-bridge-secret': bridge.secret, 'x-user-id': String(cohort.createdByUserId || decoded.userId), 'x-session-key': sessionKey, 'x-tenant-id': sessionKey },
          body: JSON.stringify({ to: `${phone}@c.us`, type: 'text', message }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`WhatsApp bridge returned ${response.status}`);
        result.sent++;
        const list = deliveredByStudent.get(String(recording._id)) || [];
        list.push(student._id);
        deliveredByStudent.set(String(recording._id), list);
      } catch (error) {
        result.failed++;
        result.errors.push(`${student.name}: ${error instanceof Error ? error.message : 'send failed'}`);
      }
    }
  }

  if (!dryRun) {
    for (const recording of recordings) {
      const newlyDelivered = deliveredByStudent.get(String(recording._id)) || [];
      if (newlyDelivered.length) await Recording.findByIdAndUpdate(recording._id, { $addToSet: { deliveredStudentIds: { $each: newlyDelivered } } });
    }
    await Cohort.findByIdAndUpdate(cohortId, { $set: { workerLastRunAt: new Date() } });
  }
  return NextResponse.json({ success: true, result });
}
