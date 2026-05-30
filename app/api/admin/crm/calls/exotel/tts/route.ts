/**
 * GET /api/admin/crm/calls/exotel/tts?logId=xxx
 * Called by Exotel when the outbound call connects.
 * Returns XML with the TTS script to read aloud.
 *
 * Script formatting symbols (write these in the template):
 *   ...    → short pause (0.5s)
 *   ....   → longer pause (1s)
 *   [pause]→ 1 second pause
 *   [stop] → 2 second pause (e.g. after greeting)
 *   CAPS   → Exotel reads with slight emphasis (natural in Hindi TTS)
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAICallLog } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const logId = request.nextUrl.searchParams.get('logId');

  let scriptText = 'नमस्ते जी! स्वर योग की तरफ से आपका बहुत स्वागत है। धन्यवाद, आपका दिन शुभ हो!';
  let language = 'hi';

  if (logId) {
    try {
      await connectDB();
      const AICallLog = getAICallLog();
      const log = await AICallLog.findById(logId).select('customPrompt language').lean() as any;
      if (log?.customPrompt?.trim()) {
        const raw = log.customPrompt
          .replace(/--- STAGE \d+: [A-Z ]+ ---\n/g, '\n')
          .trim();
        scriptText = raw;
      }
      if (log?.language) {
        language = log.language.startsWith('hi') ? 'hi' : 'en';
      }
    } catch { /* use default */ }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
${buildSayXml(scriptText, language)}
  <Hangup/>
</Response>`;

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}

/**
 * Converts script text into Exotel XML <Say> and <Pause> elements.
 * Supported symbols in template text:
 *   ...     → <Pause length="1"/>
 *   [pause] → <Pause length="1"/>
 *   [stop]  → <Pause length="2"/>
 *   \n\n    → <Pause length="1"/> (paragraph break = natural pause)
 */
function buildSayXml(text: string, language: string): string {
  // Split on pause markers
  const parts = text
    .replace(/\[stop\]/gi, '\x00STOP\x00')
    .replace(/\[pause\]/gi, '\x00PAUSE\x00')
    .replace(/\.{3,}/g, '\x00PAUSE\x00')
    .replace(/\n\n+/g, '\x00PAUSE\x00')
    .split('\x00');

  const lines: string[] = [];
  for (const part of parts) {
    if (part === 'STOP') {
      lines.push('  <Pause length="2"/>');
    } else if (part === 'PAUSE') {
      lines.push('  <Pause length="1"/>');
    } else {
      const clean = escapeXml(part.trim());
      if (clean) {
        lines.push(`  <Say voice="woman" language="${language}">${clean}</Say>`);
      }
    }
  }

  return lines.join('\n');
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
