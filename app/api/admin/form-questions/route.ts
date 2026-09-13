import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FormQuestion from '@/lib/models/FormQuestion';
import { isAdminAuthorized } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev && !isAdminAuthorized(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const formType = searchParams.get('formType');

    const filter: Record<string, any> = {};
    if (formType) {
      filter.formType = { $in: [formType, 'all'] };
    }

    const questions = await FormQuestion.find(filter).sort({ order: 1, createdAt: 1 }).lean();

    return NextResponse.json({ success: true, questions });
  } catch (error: any) {
    console.error('Error fetching form questions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev && !isAdminAuthorized(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { fieldKey, formType = 'workshop', questionType, label, placeholder, options, required, order, isActive } = body;

    if (!fieldKey || !fieldKey.trim()) {
      return NextResponse.json({ success: false, error: 'Field key is required' }, { status: 400 });
    }

    if (!questionType || !['dropdown', 'text', 'paragraph', 'radio', 'checkbox'].includes(questionType)) {
      return NextResponse.json({ success: false, error: 'Valid question type is required' }, { status: 400 });
    }

    if (!label || !label.en || !label.en.trim()) {
      return NextResponse.json({ success: false, error: 'English label is required' }, { status: 400 });
    }

    // Sanitize fieldKey: remove spaces, special chars
    const sanitizedKey = fieldKey.trim().replace(/[^a-zA-Z0-9_]/g, '');

    // Check for duplicate fieldKey within the same formType
    const existing = await FormQuestion.findOne({ fieldKey: sanitizedKey, formType });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `A question with field key "${sanitizedKey}" already exists for this form` },
        { status: 400 }
      );
    }

    const newQuestion = await FormQuestion.create({
      fieldKey: sanitizedKey,
      formType,
      questionType,
      label,
      placeholder,
      options: options || [],
      required: !!required,
      order: typeof order === 'number' ? order : 0,
      isActive: isActive !== false,
    });

    return NextResponse.json({ success: true, question: newQuestion }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating form question:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
