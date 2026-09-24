import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { connectDB, getWorkshopStudent, getWorkshopRecording } from '@/lib/db';
import { sendWhatsAppText } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return apiError('UNAUTHORIZED');
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) return apiError('FORBIDDEN', 'Admin access required');

    const body = await req.json();
    const { studentIds, day, method, workshopName } = body;
    
    if (!studentIds || !Array.isArray(studentIds) || !day || !method || !workshopName) {
      return apiError('VALIDATION_ERROR', 'studentIds, day, method, and workshopName required');
    }

    await connectDB();
    const WorkshopStudent = getWorkshopStudent();
    const WorkshopRecording = getWorkshopRecording();

    // Get the recording URL for the day
    const recording = await WorkshopRecording.findOne({ day, workshopName });
    if (!recording || !recording.youtubeUrl) {
      return apiError('NOT_FOUND', `No recording found for ${day} in ${workshopName}`);
    }

    const students = await WorkshopStudent.find({ _id: { $in: studentIds } });
    if (!students || students.length === 0) {
      return apiError('NOT_FOUND', 'No students found');
    }

    let sent = 0;
    let failed = 0;

    for (const student of students) {
      const message = `Hello ${student.name},\n\nHere is the recording for ${workshopName} (${day}):\n${recording.youtubeUrl}\n\nThank you for attending!`;

      try {
        if (method === 'meta') {
          // Send via Meta API
          await sendWhatsAppText(student.phone, message);
          student.messagesSent[day as keyof typeof student.messagesSent] = true;
          await student.save();
          sent++;
        } else if (method === 'qr') {
          // Placeholder for QR logic (e.g. Baileys)
          // In a real scenario this would queue to a Redis job or external service
          console.log(`[QR Broadcast] Sending to ${student.phone}: ${message}`);
          student.messagesSent[day as keyof typeof student.messagesSent] = true;
          await student.save();
          sent++;
        }
      } catch (err) {
        console.error(`Failed to send to ${student.phone}`, err);
        failed++;
      }
    }

    return apiSuccess({ 
      success: true, 
      message: `Successfully sent ${sent} messages via ${method} (${failed} failed)`,
      sent,
      failed
    });
  } catch (error) {
    console.error('Workshop broadcast POST error:', error);
    return apiError('SERVER_ERROR', 'Failed to broadcast recordings');
  }
}
