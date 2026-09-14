import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getWorkshopCohort, getWorkshopStudent, getWorkshopAttendance, getWorkshopRecordingDelivery } from '@/lib/schemas/workshopStudentManagementSchemas';

export const dynamic = 'force-dynamic';

function admin(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
  return verifyToken(token);
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
    const [cohort, students, attendance, recordings] = await Promise.all([
      Cohort.findById(cohortId).lean(),
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
    whatsappGroupId: body.whatsappGroupId || undefined,
    communityId: body.communityId || undefined,
    createdByUserId: decoded.userId,
  });
  return NextResponse.json({ cohort }, { status: 201 });
}
