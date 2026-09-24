import { NextRequest, NextResponse } from 'next/server';
import { uploadToPath } from '@/lib/bunny-storage';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // 1. Save incoming Google Form data to Bunny Storage (since you prefer Bunny over MongoDB)
    const timestamp = Date.now();
    // Using a generic key since Google Forms payload could vary
    const storageKey = `google-forms-sync/${timestamp}_submission.json`;

    const fileBuffer = Buffer.from(JSON.stringify({
      ...data,
      syncedAt: new Date().toISOString(),
    }, null, 2), 'utf-8');

    const storageUrl = await uploadToPath(fileBuffer, storageKey, 'application/json');

    // Note: If you want to automatically forward this data to ANOTHER Google Sheet or CRM tool, 
    // you can import and use `appendToGoogleSheet` from `@/lib/google-services` here!

    return NextResponse.json({
      success: true,
      message: 'Google Form data successfully received and saved to Bunny Storage.',
      storageUrl,
    });
  } catch (error: any) {
    console.error('Google Form Sync Webhook Error:', error);
    return NextResponse.json(
      { error: 'Failed to process Google Form submission', details: error.message },
      { status: 500 }
    );
  }
}
