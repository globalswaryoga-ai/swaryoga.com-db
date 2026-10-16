import { NextRequest, NextResponse } from 'next/server';
import {
  listEnrollmentsByCourse,
  countEnrollmentsByCourse,
} from '@/lib/bunnyCourseRepository';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> | { courseId: string } }
) {
  try {
    const resolved = await params;
    const courseId = resolved.courseId;

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

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

    const allStudents = [...dummyStudents, ...students];
    const displayCount = 15 + totalCount;

    return NextResponse.json({
      success: true,
      students: allStudents,
      totalCount: displayCount,
      realCount: totalCount,
    });
  } catch (error) {
    console.error('Error fetching course enrollments:', error);
    return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 });
  }
}
