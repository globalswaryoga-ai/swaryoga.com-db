import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { connectDB, getWorkshopStudent } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return apiError('UNAUTHORIZED');
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) return apiError('FORBIDDEN', 'Admin access required');

    const { searchParams } = new URL(req.url);
    const workshopName = searchParams.get('workshopName');

    await connectDB();
    const WorkshopStudent = getWorkshopStudent();
    
    const query: any = {};
    if (workshopName) {
      query.workshopName = workshopName;
    }

    const students = await WorkshopStudent.find(query).sort({ createdAt: -1 }).lean();

    return apiSuccess({ students });
  } catch (error) {
    console.error('Workshop students error:', error);
    return apiError('SERVER_ERROR', 'Failed to fetch students');
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return apiError('UNAUTHORIZED');
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) return apiError('FORBIDDEN', 'Admin access required');

    const body = await req.json();
    const { action, students, workshopName } = body;

    await connectDB();
    const WorkshopStudent = getWorkshopStudent();

    if (action === 'sync') {
      // Sync multiple students
      if (!Array.isArray(students) || !workshopName) {
        return apiError('BAD_REQUEST', 'Invalid data for sync');
      }

      let added = 0;
      let updated = 0;

      for (const st of students) {
        if (!st.phone) continue;
        const existing = await WorkshopStudent.findOne({ phone: st.phone, workshopName });
        if (existing) {
          // Update attendance if passed
          if (st.attendance) {
            existing.attendance = { ...existing.attendance, ...st.attendance };
            await existing.save();
          }
          updated++;
        } else {
          await WorkshopStudent.create({
            name: st.name || 'Unknown',
            phone: st.phone,
            email: st.email || '',
            source: st.source || 'manual',
            sourceId: st.sourceId || '',
            workshopName: workshopName,
            attendance: st.attendance || { day1: false, day2: false, day3: false, day4: false, day5: false },
          });
          added++;
        }
      }
      return apiSuccess({ message: 'Sync complete', added, updated });
    }

    if (action === 'update_attendance') {
      const { studentId, day, present } = body;
      if (!studentId || !day) return apiError('BAD_REQUEST', 'Missing studentId or day');
      
      const student = await WorkshopStudent.findById(studentId);
      if (!student) return apiError('NOT_FOUND', 'Student not found');
      
      student.attendance[day as keyof typeof student.attendance] = present;
      await student.save();
      
      return apiSuccess({ message: 'Attendance updated' });
    }
    
    if (action === 'delete') {
       const { studentId } = body;
       await WorkshopStudent.findByIdAndDelete(studentId);
       return apiSuccess({ message: 'Deleted' });
    }

    return apiError('BAD_REQUEST', 'Invalid action');
  } catch (error) {
    console.error('Workshop students error:', error);
    return apiError('SERVER_ERROR', 'Failed to process request');
  }
}
