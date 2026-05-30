/**
 * POST /api/admin/crm/calls/exotel/test
 * Makes a single test TTS call to a phone number using a template script.
 * Body: { phoneNumber, templateId?, scriptText?, language? }
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getAICallLog, getAICallTemplate } from '@/lib/schemas/enterpriseSchemas';
import { makeExotelTTSCall, isExotelConfigured } from '@/lib/exotelTTS';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');

    if (!isExotelConfigured()) {
      return apiError('SERVICE_UNAVAILABLE', 'Exotel not configured. Add EXOTEL_* env vars to Vercel.');
    }

    const { phoneNumber, templateId, scriptText, language } = await request.json();
    if (!phoneNumber) return apiError('VALIDATION_ERROR', 'phoneNumber is required');

    await connectDB();
    const AICallLog = getAICallLog();

    // Resolve script
    let script = scriptText || '';
    let lang = language || 'hi';

    if (templateId && !scriptText) {
      const AICallTemplate = getAICallTemplate();
      const tmpl = await AICallTemplate.findById(templateId).lean() as any;
      if (tmpl?.promptText) {
        script = tmpl.promptText;
        lang = tmpl.language || 'hi';
      }
    }

    if (!script) {
      script = 'नमस्ते जी! यह स्वर योग की तरफ से एक परीक्षण कॉल है। धन्यवाद!';
    }

    // Create a test log entry so TTS endpoint can fetch the script
    const adminId = decoded.userId || decoded.email || 'admin';
    const log = await AICallLog.create({
      leadId: null,
      direction: 'outbound',
      purpose: 'test',
      customPrompt: script,
      status: 'queued',
      phoneNumber: phoneNumber.replace(/\D/g, ''),
      language: lang.startsWith('hi') ? 'hi-IN' : 'en-IN',
      initiatedBy: adminId,
      batchName: `TEST-${Date.now()}`,
      callMode: 'info_only',
      callProvider: 'exotel',
    });

    const appBase = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://swaryoga.com');

    const result = await makeExotelTTSCall(phoneNumber, String(log._id), appBase);

    if (!result.success) {
      await AICallLog.findByIdAndDelete(log._id);
      return apiError('SERVER_ERROR', result.error || 'Test call failed');
    }

    await AICallLog.findByIdAndUpdate(log._id, {
      $set: { status: 'ringing', startedAt: new Date(), retellBatchId: result.callSid },
    });

    return apiSuccess({
      callSid: result.callSid,
      message: `Test call initiated to ${phoneNumber}. You should receive a call in a few seconds.`,
    });
  } catch (err: any) {
    console.error('[exotel/test]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
