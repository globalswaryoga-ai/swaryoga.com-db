/**
 * Controls the Sadhana Zoom Meeting SDK bot running on a dedicated Hetzner
 * VPS (separate from the WhatsApp bridge server). The bot is a compiled C++
 * program (Zoom's official Linux Meeting SDK sample, adapted) that joins a
 * Zoom meeting as a real participant and plays a video (with audio) into it
 * via the SDK's raw data APIs — this is the only way to inject a
 * programmatic video source into a live Zoom meeting; there is no REST API
 * for it, which is why earlier attempts (zoomBotService.ts,
 * zoomBotServiceSimple.ts, hetznerStreamingIntegration.ts) never actually
 * worked — they called Zoom REST endpoints that don't exist for this.
 */

import crypto from 'crypto';

const SDK_KEY = process.env.ZOOM_SDK_KEY || '';
const SDK_SECRET = process.env.ZOOM_SDK_SECRET || '';
const BOT_API_URL = process.env.SADHANA_BOT_API_URL || '';
const BOT_API_SECRET = process.env.SADHANA_BOT_API_SECRET || '';

function base64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generates a Meeting SDK auth JWT for a specific meeting. Per-meeting (the
 * `mn` claim is bound to it), so this must be regenerated for every join —
 * it cannot be cached/reused across meetings.
 */
export function generateMeetingSdkJwt(meetingNumber: string, expiresInSeconds = 3600): string {
  if (!SDK_KEY || !SDK_SECRET) {
    throw new Error('ZOOM_SDK_KEY / ZOOM_SDK_SECRET not configured');
  }

  const header = { alg: 'HS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + Math.max(expiresInSeconds, 1800); // Zoom requires >= 1800s
  const payload = {
    appKey: SDK_KEY,
    mn: meetingNumber,
    role: 0, // 0 = participant; the bot never needs host rights
    iat,
    exp,
    tokenExp: exp,
  };

  const encodedHeader = base64url(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64url(Buffer.from(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = base64url(crypto.createHmac('sha256', SDK_SECRET).update(signingInput).digest());
  return `${signingInput}.${signature}`;
}

export function isBotApiConfigured(): boolean {
  return !!(SDK_KEY && SDK_SECRET && BOT_API_URL && BOT_API_SECRET);
}

interface StartBotParams {
  meetingNumber: string;
  meetingPassword: string;
  botName?: string;
  videoUrl: string;
  chatMessage?: string;
  durationMinutes: number;
}

interface BotApiResponse {
  success: boolean;
  error?: string;
  pid?: number;
}

async function callBotApi(path: string, body: Record<string, unknown>): Promise<BotApiResponse> {
  if (!BOT_API_URL || !BOT_API_SECRET) {
    return { success: false, error: 'SADHANA_BOT_API_URL / SADHANA_BOT_API_SECRET not configured' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${BOT_API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-Api-Secret': BOT_API_SECRET,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Bot API request failed' };
  } finally {
    clearTimeout(timeout);
  }
}

/** Joins the meeting and starts playing videoUrl (with audio) into it. */
export async function startSadhanaBot(params: StartBotParams): Promise<BotApiResponse> {
  const token = generateMeetingSdkJwt(params.meetingNumber);
  return callBotApi('/start-bot', {
    meetingNumber: params.meetingNumber,
    token,
    password: params.meetingPassword,
    botName: params.botName || 'Swar Sadhana',
    videoUrl: params.videoUrl,
    chatMessage: params.chatMessage || '',
    durationMinutes: params.durationMinutes,
  });
}

/** Stops the bot early (e.g. admin manually ends the session). Auto-leave
 * after durationMinutes already happens on its own otherwise. */
export async function stopSadhanaBot(meetingNumber: string): Promise<BotApiResponse> {
  return callBotApi('/stop-bot', { meetingNumber });
}
