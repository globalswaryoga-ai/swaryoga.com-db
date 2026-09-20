import { NextRequest, NextResponse } from 'next/server';
import { connectDB, EnquiryForm } from '@/lib/db';
import FormQuestion from '@/lib/models/FormQuestion';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { formId: string } }
) {
  try {
    await connectDB();
    const { formId } = params;

    const form = await EnquiryForm.findOne({ formId }).lean();
    if (!form) {
      return NextResponse.json({ success: false, error: 'Form not found' }, { status: 404 });
    }
    if (!form.isActive) {
      return NextResponse.json({ success: false, error: 'Form is inactive' }, { status: 400 });
    }

    const questions = await FormQuestion.find({ formId, isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();

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
