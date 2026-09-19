import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { listCohorts, getCohort, listRecordings, listStudents } from '@/lib/workshopBunnyRepository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workshops
 * List workshops for public/logged-in users
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    let decoded: any = null;
    try {
      decoded = verifyToken(authHeader);
    } catch (e) {
      // Not logged in
    }

    const { searchParams } = new URL(req.url);
    const cohortId = searchParams.get('slug') || searchParams.get('id');

    // Single workshop (cohort) detail
    if (cohortId) {
      const cohort = await getCohort(cohortId);
      if (!cohort) {
        return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
      }

      let isEnrolled = false;
      let userStudentData = null;

      if (decoded?.id) {
        const students = await listStudents(cohortId, true);
        const userStudent = students.find((s: any) => 
          s.leadId === decoded.id || 
          s.email === decoded.email ||
          s.whatsappNumber === decoded.whatsappNumber
        );
        if (userStudent) {
          isEnrolled = true;
          userStudentData = userStudent;
        }
      }

      // Get recordings
      const recordings = await listRecordings(cohortId);
      
      const videos = recordings.map((rec: any) => ({
        ...rec,
        canWatch: isEnrolled || rec.accessType === 'free',
        s3Key: undefined,
      }));

      return NextResponse.json({
        success: true,
        workshop: {
          ...cohort,
          batchCount: 1,
        },
        userEnrollment: isEnrolled ? userStudentData : null,
        videos,
        isLoggedIn: !!decoded,
      });
    }

    // List all cohorts (workshops)
    const cohorts = await listCohorts();

    const enrichedWorkshops = await Promise.all(
      cohorts.map(async (cohort) => {
        const recordings = await listRecordings(cohort._id);
        
        let isEnrolled = false;
        if (decoded?.id) {
          const students = await listStudents(cohort._id, true);
          isEnrolled = students.some((s: any) => 
            s.leadId === decoded.id || 
            s.email === decoded.email ||
            s.whatsappNumber === decoded.whatsappNumber
          );
        }

        return {
          ...cohort,
          slug: cohort._id, // map id to slug for frontend compat
          batchCount: 1,
          videoCount: recordings.length,
          freeVideoCount: recordings.filter((r: any) => r.accessType === 'free').length,
          isEnrolled,
        };
      })
    );

    return NextResponse.json({
      success: true,
      workshops: enrichedWorkshops,
      isLoggedIn: !!decoded,
    });
  } catch (error: any) {
    console.error('[Public Workshops API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
