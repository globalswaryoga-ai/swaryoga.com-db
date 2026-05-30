/**
 * GET /api/admin/crm/calls/exotel/tts?logId=xxx
 * Called by Exotel when the outbound call connects.
 * Returns XML with the TTS script to read aloud.
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAICallLog } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const logId = request.nextUrl.searchParams.get('logId');

  let scriptText = 'Namaste ji! Swar Yoga ki taraf se aapko dhanyavaad. Aapka din shubh ho!';

  if (logId) {
    try {
      await connectDB();
      const AICallLog = getAICallLog();
      const log = await AICallLog.findById(logId).select('customPrompt leadId').lean() as any;
      if (log?.customPrompt?.trim()) {
        // Strip stage markers if present, join all stages
        const raw = log.customPrompt
          .replace(/--- STAGE \d+: [A-Z ]+ ---\n/g, '')
          .trim();
        scriptText = raw;
      }
    } catch { /* use default */ }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman" language="hi-IN">${escapeXml(scriptText)}</Say>
  <Hangup/>
</Response>`;

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
