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
    const formId = searchParams.get('formId');

    const filter: Record<string, any> = {};
    if (formId) {
      filter.formId = formId;
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
    const {
      fieldKey,
      formId,
      questionType,
      label,
      placeholder,
      options,
      required,
      order,
      isActive,
      // New rich-content fields
      imageUrl,
      qrCodeUrl,
      linkUrl,
      linkLabel,
      paymentConfig,
    } = body;

    if (!fieldKey || !fieldKey.trim()) {
      return NextResponse.json({ success: false, error: 'Field key is required' }, { status: 400 });
    }

    const validTypes = ['dropdown', 'text', 'paragraph', 'radio', 'checkbox', 'info', 'payment'];
    if (!questionType || !validTypes.includes(questionType)) {
      return NextResponse.json({ success: false, error: 'Valid question type is required' }, { status: 400 });
    }

    if (!label || !label.en || !label.en.trim()) {
      return NextResponse.json({ success: false, error: 'English label is required' }, { status: 400 });
    }

    const sanitizedKey = fieldKey.trim().replace(/[^a-zA-Z0-9_]/g, '');

    const existing = await FormQuestion.findOne({ fieldKey: sanitizedKey, formId });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `A question with field key "${sanitizedKey}" already exists for this form` },
        { status: 400 }
      );
    }

    const newQuestion = await FormQuestion.create({
      fieldKey: sanitizedKey,
      formId,
      questionType,
      label,
      placeholder,
      options: options || [],
      required: !!required,
      order: typeof order === 'number' ? order : 0,
      isActive: isActive !== false,
      imageUrl: imageUrl || '',
      qrCodeUrl: qrCodeUrl || '',
      linkUrl: linkUrl || '',
      linkLabel: linkLabel || '',
      paymentConfig: paymentConfig || null,
    });

    return NextResponse.json({ success: true, question: newQuestion }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating form question:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
