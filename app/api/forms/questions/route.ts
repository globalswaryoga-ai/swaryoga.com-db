import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FormQuestion from '@/lib/models/FormQuestion';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const formType = searchParams.get('formType') || 'workshop';

    const questions = await FormQuestion.find({
      formType: { $in: [formType, 'all'] },
      isActive: true,
    })
      .sort({ order: 1, createdAt: 1 })
      .select('fieldKey formType questionType label placeholder options required order')
      .lean();

    return NextResponse.json({
      success: true,
      questions,
    });
  } catch (error: any) {
    console.error('Error fetching public form questions:', error);
    return NextResponse.json({ success: false, questions: [] }, { status: 200 });
  }
}
