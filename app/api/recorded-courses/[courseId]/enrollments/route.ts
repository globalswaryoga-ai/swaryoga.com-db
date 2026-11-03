import { NextRequest, NextResponse } from 'next/server';
<<<<<<< HEAD
import {
  listEnrollmentsByCourse,
  countEnrollmentsByCourse,
} from '@/lib/bunnyCourseRepository';
=======
import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
<<<<<<< HEAD
  { params }: { params: Promise<{ courseId: string }> | { courseId: string } }
) {
  try {
    const resolved = await params;
    const courseId = resolved.courseId;
=======
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '15', 10);
    const skip = parseInt(request.nextUrl.searchParams.get('skip') || '0', 10);
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

<<<<<<< HEAD
    const [enrollments, totalCount] = await Promise.all([
      listEnrollmentsByCourse(courseId),
      countEnrollmentsByCourse(courseId),
    ]);

    const students = enrollments.map((enrollment) => ({
      _id: enrollment.id,
      firstName: enrollment.data?.firstName || 'Student',
      lastName: enrollment.data?.lastName || '',
      email: enrollment.data?.email || '',
      enrolledAt: enrollment.enrolledAt,
      isReal: true,
    }));
=======
    let realEnrollments: any[] = [];
    let totalCount = 0;

    if (isBunnyDatabaseConfigured()) {
      const [listRes, countRes] = await Promise.all([
        bunnyExecute({
          sql: `SELECT * FROM course_enrollments_sql 
                WHERE course_id = ? AND status = 'active' 
                ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          args: [courseId, limit, skip],
        }),
        bunnyExecute({
          sql: `SELECT COUNT(*) as cnt FROM course_enrollments_sql 
                WHERE course_id = ? AND status = 'active'`,
          args: [courseId],
        }),
      ]);

      totalCount = Number(countRes.rows[0]?.cnt) || 0;
      realEnrollments = listRes.rows.map((r: any) => {
        let data: any = {};
        try {
          data = r.data_json ? JSON.parse(String(r.data_json)) : {};
        } catch {}
        return {
          _id: r.id,
          firstName: data.firstName || 'Student',
          lastName: data.lastName || 'User',
          email: data.email || '',
          enrolledAt: r.enrolled_at || r.created_at,
          isReal: true,
        };
      });
    }
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

    const dummyNames = [
      { firstName: 'Rajesh', lastName: 'Kumar' },
      { firstName: 'Priya', lastName: 'Singh' },
      { firstName: 'Amit', lastName: 'Patel' },
      { firstName: 'Neha', lastName: 'Gupta' },
      { firstName: 'Vikram', lastName: 'Sharma' },
      { firstName: 'Anjali', lastName: 'Verma' },
      { firstName: 'Rohan', lastName: 'Desai' },
      { firstName: 'Sneha', lastName: 'Iyer' },
      { firstName: 'Arjun', lastName: 'Reddy' },
      { firstName: 'Divya', lastName: 'Nair' },
      { firstName: 'Sanjay', lastName: 'Rao' },
      { firstName: 'Pooja', lastName: 'Menon' },
      { firstName: 'Aditya', lastName: 'Bhatt' },
      { firstName: 'Kavya', lastName: 'Krishnan' },
      { firstName: 'Nikhil', lastName: 'Bhat' },
    ];

    const dummyStudents = dummyNames.map((name, index) => {
      const daysAgo = index < 5 ? 4 : 5;
      return {
        _id: `dummy-${index}`,
        firstName: name.firstName,
        lastName: name.lastName,
        email: `student${index + 1}@example.com`,
        enrolledAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
        isReal: false,
      };
    });

<<<<<<< HEAD
    const allStudents = [...dummyStudents, ...students];
=======
    const allStudents = [...dummyStudents, ...realEnrollments];
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
    const displayCount = 15 + totalCount;

    return NextResponse.json({
      success: true,
<<<<<<< HEAD
      students: allStudents,
      totalCount: displayCount,
      realCount: totalCount,
    });
  } catch (error) {
    console.error('Error fetching course enrollments:', error);
    return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 });
=======
      students: allStudents.slice(0, Math.max(15, allStudents.length)),
      total: displayCount,
      actualEnrollments: totalCount,
      limit,
      skip,
    });
  } catch (error: any) {
    console.error('[Get Enrollments API Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
  }
}
