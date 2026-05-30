/**
 * Exotel TTS (Text-to-Speech) outbound calling
 * Used for Info Only broadcasts — ~₹1-2 per call vs ₹17 for Retell
 */

export interface ExotelCallTask {
  toNumber: string;     // E.164 or 10-digit Indian number
  leadId: string;
  logId: string;        // AICallLog _id — used to fetch script via TTS endpoint
}

export interface ExotelBatchResult {
  success: boolean;
  queued: number;
  failed: number;
  callSids: string[];
  errors: string[];
}

function getConfig() {
  return {
    sid:        process.env.EXOTEL_SID || '',
    apiKey:     process.env.EXOTEL_API_KEY || '',
    apiToken:   process.env.EXOTEL_API_TOKEN || '',
    subdomain:  process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com',
    fromNumber: process.env.EXOTEL_FROM_NUMBER || '',
  };
}

export function isExotelConfigured(): boolean {
  const c = getConfig();
  return !!(c.sid && c.apiKey && c.apiToken && c.fromNumber);
}

function formatPhone(num: string): string {
  const digits = num.replace(/\D/g, '');
  if (digits.length === 10) return `0${digits}`;          // 0XXXXXXXXXX for India
  if (digits.startsWith('91') && digits.length === 12) return `0${digits.slice(2)}`; // 91XXXXXXXXXX → 0XXXXXXXXXX
  if (digits.startsWith('0') && digits.length === 11) return digits;
  return digits;
}

/**
 * Make a single outbound TTS call via Exotel.
 * When the call connects, Exotel calls our /api/exotel/tts?logId=xxx endpoint
 * which returns XML with the script text.
 */
export async function makeExotelTTSCall(
  toNumber: string,
  logId: string,
  appBaseUrl: string,
): Promise<{ success: boolean; callSid?: string; error?: string }> {
  const c = getConfig();
  if (!isExotelConfigured()) return { success: false, error: 'Exotel not configured' };

  const ttsUrl = `${appBaseUrl}/api/admin/crm/calls/exotel/tts?logId=${logId}`;
  const statusUrl = `${appBaseUrl}/api/admin/crm/calls/exotel/status?logId=${logId}`;
  const from = formatPhone(c.fromNumber);
  const to = formatPhone(toNumber);

  const params = new URLSearchParams({
    From:           from,
    To:             to,
    CallerId:       from,
    Url:            ttsUrl,
    Method:         'GET',
    TimeLimit:      '180',       // max 3 min
    TimeOut:        '30',        // ring for 30s
    StatusCallback: statusUrl,
  });

  const basicAuth = Buffer.from(`${c.apiKey}:${c.apiToken}`).toString('base64');
  const url = `https://${c.subdomain}/v1/Accounts/${c.sid}/Calls/connect.json`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const text = await res.text();
    if (!res.ok) {
      return { success: false, error: `Exotel API error ${res.status}: ${text}` };
    }

    const json = JSON.parse(text);
    const callSid = json?.Call?.Sid || json?.sid;
    return { success: true, callSid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Make multiple TTS calls in sequence (Exotel doesn't have batch API).
 * Staggers calls by 1s to avoid rate limiting.
 */
export async function makeExotelBatchTTS(
  tasks: ExotelCallTask[],
  appBaseUrl: string,
): Promise<ExotelBatchResult> {
  const result: ExotelBatchResult = { success: true, queued: 0, failed: 0, callSids: [], errors: [] };

  for (const task of tasks) {
    const r = await makeExotelTTSCall(task.toNumber, task.logId, appBaseUrl);
    if (r.success && r.callSid) {
      result.queued++;
      result.callSids.push(r.callSid);
    } else {
      result.failed++;
      result.errors.push(`${task.toNumber}: ${r.error}`);
    }
    // Small delay to avoid hammering Exotel
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (result.failed > 0 && result.queued === 0) result.success = false;
  return result;
}
