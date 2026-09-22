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
    const questions = allQuestions
      .filter(q => q.isActive)
      .map(q => {
        // Normalize label: may be a plain string from older/imported data
        const label =
          q.label && typeof q.label === 'object'
            ? q.label
            : { en: String(q.label || ''), hi: '', mr: '' };

        // Normalize options: may be plain strings ["Male","Female"] or proper objects
        const options = (Array.isArray(q.options) ? q.options : []).map((o: any) => {
          if (typeof o === 'string') {
            return { value: o, label: { en: o } };
          }
          if (o && typeof o === 'object') {
            // Already has value/label — ensure label is { en }
            const lbl =
              o.label && typeof o.label === 'object'
                ? o.label
                : { en: String(o.label ?? o.value ?? ''), hi: '', mr: '' };
            return { value: o.value ?? o.label?.en ?? String(o), label: lbl };
          }
          return { value: String(o), label: { en: String(o) } };
        });

        return { ...q, label, options };
      });

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
