import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { connectDB, getWorkshopRecording } from '@/lib/db';

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
    const WorkshopRecording = getWorkshopRecording();
    
    const query: any = {};
    if (workshopName) {
      query.workshopName = workshopName;
    }

    const recordingsArray = await WorkshopRecording.find(query).lean();
    
    // Convert array to the map object format the UI expects: { day1: url, day2: url }
    const recordings: Record<string, string> = { day1: '', day2: '', day3: '', day4: '', day5: '' };
    for (const r of recordingsArray) {
      if (r.day && r.youtubeUrl) {
        recordings[r.day] = r.youtubeUrl;
      }
    }

    return apiSuccess({ recordings });
  } catch (error) {
    console.error('Workshop recordings error:', error);
    return apiError('SERVER_ERROR', 'Failed to fetch recordings');
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
    const { day, url, workshopName } = body;
    
    if (!day || !workshopName) return apiError('VALIDATION_ERROR', 'Day and workshopName required');

    await connectDB();
    const WorkshopRecording = getWorkshopRecording();

    if (!url) {
      // If URL is empty, it means we should delete the recording mapping for this day
      await WorkshopRecording.findOneAndDelete({ day, workshopName });
      return apiSuccess({ success: true, message: `Removed URL for ${day}` });
    }

    // Upsert the recording for this day and workshop
    await WorkshopRecording.findOneAndUpdate(
      { day, workshopName },
      { 
        $set: { 
          youtubeUrl: url, 
          title: `Recording for ${day}`,
        }
      },
      { upsert: true, new: true }
    );

    return apiSuccess({ success: true, message: `Saved URL for ${day}` });
  } catch (error) {
    console.error('Workshop recordings POST error:', error);
    return apiError('SERVER_ERROR', 'Failed to save recording');
  }
}
