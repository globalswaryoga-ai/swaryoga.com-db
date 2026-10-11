import { NextRequest, NextResponse } from 'next/server';
import { listQuestions } from '@/lib/bunny-forms-db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formType = searchParams.get('formType') || 'workshop';

    const questions = (await listQuestions()).filter(question =>
      question.isActive !== false && [formType, 'all'].includes(question.formId));

    return NextResponse.json({
      success: true,
      questions,
    });
  } catch (error: any) {
    console.error('Error fetching public form questions:', error);
    return NextResponse.json({ success: false, error: 'Form questions are unavailable. Please retry.' }, { status: 503 });
  }
}
