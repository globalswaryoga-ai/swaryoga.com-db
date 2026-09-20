import { NextRequest, NextResponse } from 'next/server';
import { getFormById, listQuestions } from '@/lib/bunny-forms-db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { formId: string } }
) {
  try {
    const { formId } = params;

    const form = await getFormById(formId);
    if (!form) {
      return NextResponse.json({ success: false, error: 'Form not found' }, { status: 404 });
    }
    if (!form.isActive) {
      return NextResponse.json({ success: false, error: 'Form is inactive' }, { status: 400 });
    }

    const allQuestions = await listQuestions(formId);
    const questions = allQuestions.filter(q => q.isActive);

    return NextResponse.json({
      success: true,
      form,
      questions,
    });
  } catch (error: any) {
    console.error('Error fetching public form data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
