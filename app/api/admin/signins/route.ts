import { connectDB } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Verify admin token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await connectDB();
    
    // Fetch signin data from database
    const signins: any[] = [];

    return NextResponse.json(signins, { status: 200 });
  } catch (error) {
    console.error('Error fetching signin data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signin data' },
      { status: 500 }
    );
  }
}
