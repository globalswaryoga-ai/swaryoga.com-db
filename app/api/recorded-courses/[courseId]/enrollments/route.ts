import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCourseEnrollment } from '@/lib/schemas/recordedCourseSchemas';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    await connectDB();

    const courseId = params.courseId;
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '15', 10);
    const skip = parseInt(request.nextUrl.searchParams.get('skip') || '0', 10);

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID required' },
        { status: 400 }
      );
    }

    const CourseEnrollment = getCourseEnrollment();

    // Fetch enrolled students with user details
    const enrollments = await CourseEnrollment.find({
      courseId,
      status: 'active',
    })
      .populate({
        path: 'userId',
        select: 'firstName lastName email',
      })
      .select('enrolledAt userId')
      .sort({ enrolledAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Fetch total count for pagination
    const totalCount = await CourseEnrollment.countDocuments({
      courseId,
      status: 'active',
    });

    let students = enrollments.map((enrollment: any) => ({
      _id: enrollment._id,
      firstName: enrollment.userId?.firstName || 'Unknown',
      lastName: enrollment.userId?.lastName || 'User',
      email: enrollment.userId?.email || '',
      enrolledAt: enrollment.enrolledAt,
      isReal: true,
    }));

    // Add 15 dummy students to base list
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

    const dummyStudents = dummyNames.map((name, index) => ({
      _id: `dummy-${index}`,
      firstName: name.firstName,
      lastName: name.lastName,
      email: `student${index + 1}@example.com`,
      enrolledAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      isReal: false,
    }));

    // Combine: base 15 dummy + real enrollments
    const allStudents = [...dummyStudents, ...students];
    const displayCount = 15 + totalCount; // 15 base + actual enrollments

    return NextResponse.json({
      success: true,
      students: allStudents.slice(0, Math.max(15, allStudents.length)),
      total: displayCount, // This is what shows as "X Students Joined"
      actualEnrollments: totalCount,
      limit,
      skip,
    });
  } catch (error: any) {
    console.error('[Get Enrollments API Error]:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
