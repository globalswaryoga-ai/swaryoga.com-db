import { NextResponse } from 'next/server';
import { createSubmission } from '@/lib/bunny-forms-db';

/**
 * Expected payload (sent via Apps Script webhook):
 * {
 *   responses: [
 *     {
 *       email: string,
 *       country: string,
 *       // any other fields
 *     },
 *     ...
 *   ]
 * }
 */
export async function POST(req: Request) {
  // Optional secret verification
  const secret = process.env.GOOGLE_WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers.get('x-webhook-secret');
    if (header !== secret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const responses = payload.responses ?? [];
  if (!Array.isArray(responses)) {
    return NextResponse.json({ error: 'responses must be an array' }, { status: 400 });
  }

  const formId = process.env.GOOGLE_FORM_ID;
  if (!formId) {
    return NextResponse.json({ error: 'GOOGLE_FORM_ID not configured' }, { status: 500 });
  }

  // For each response, create a submission.
  // Known fields: email, country (you can map others as needed).
  // All other fields are stored as JSON in form_data.
  let created = 0;
  for (const resp of responses) {
    const { email, country, ...rest } = resp;
    const submission = {
      formId,
      name: resp.name || '',
      mobile: resp.mobile || '',
      email: email || '',
      gender: resp.gender || '',
      city: resp.city || '',
      answers: {}, // legacy column, not used
      paymentStatus: 'pending',
      amount: 0,
      currency: 'INR',
      formData: JSON.stringify({ country, ...rest }),
    };
    try {
      await createSubmission(submission);
      created++;
    } catch (e) {
      console.error('Failed to create submission', e);
    }
  }

  return NextResponse.json({ received: responses.length, created });
}
