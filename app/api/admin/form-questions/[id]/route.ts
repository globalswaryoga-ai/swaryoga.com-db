import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FormQuestion from '@/lib/models/FormQuestion';
import { isAdminAuthorized } from '@/lib/adminAuth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev && !isAdminAuthorized(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = params;
    const body = await request.json();

    const updated = await FormQuestion.findByIdAndUpdate(
      id,
      {
        ...(body.label && { label: body.label }),
        ...(body.placeholder && { placeholder: body.placeholder }),
        ...(body.questionType && { questionType: body.questionType }),
        ...(body.options !== undefined && { options: body.options }),
        ...(body.required !== undefined && { required: !!body.required }),
        ...(body.order !== undefined && { order: body.order }),
        ...(body.isActive !== undefined && { isActive: !!body.isActive }),
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, question: updated });
  } catch (error: any) {
    console.error('Error updating form question:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev && !isAdminAuthorized(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = params;

    const deleted = await FormQuestion.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Question deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting form question:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
