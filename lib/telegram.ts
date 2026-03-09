/**
 * Telegram Bot API Integration
 * 
 * Multi-tenant support: Each CRM user can have their own bot token,
 * or fall back to the global TELEGRAM_BOT_TOKEN env var.
 * 
 * Setup:
 * 1. Create a bot via @BotFather on Telegram
 * 2. Get the bot token
 * 3. Save token via CRM Telegram settings (per-user) or set TELEGRAM_BOT_TOKEN globally
 * 4. Set webhook via the CRM settings page
 */

const TELEGRAM_API = 'https://api.telegram.org/bot';

export interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  date: number;
  chat: TelegramChat;
  from?: { id: number; first_name: string; last_name?: string; username?: string; is_bot?: boolean };
  text?: string;
  photo?: Array<{ file_id: string; width: number; height: number }>;
  document?: { file_id: string; file_name: string; mime_type: string };
  video?: { file_id: string; duration: number; width: number; height: number };
  caption?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
}

// ─── Resolve Bot Token ───────────────────────────────────────────────

function resolveBotToken(customToken?: string): string | null {
  return customToken || process.env.TELEGRAM_BOT_TOKEN || null;
}

// ─── Bot Info & Webhook ──────────────────────────────────────────────

/** Verify a bot token and get bot info */
export async function verifyBotToken(botToken: string): Promise<{ ok: boolean; result?: TelegramBotInfo; error?: string }> {
  try {
    const res = await fetch(`${TELEGRAM_API}${botToken}/getMe`);
    const data = await res.json();
    if (!data.ok) return { ok: false, error: data.description || 'Invalid bot token' };
    return { ok: true, result: data.result };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Failed to connect to Telegram API' };
  }
}

/** Set webhook for receiving updates */
export async function setWebhook(botToken: string, webhookUrl: string, secretToken?: string): Promise<TelegramResponse> {
  try {
    const body: any = {
      url: webhookUrl,
      allowed_updates: ['message', 'channel_post'],
    };
    if (secretToken) body.secret_token = secretToken;

    const res = await fetch(`${TELEGRAM_API}${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

/** Remove webhook */
export async function deleteWebhook(botToken: string): Promise<TelegramResponse> {
  try {
    const res = await fetch(`${TELEGRAM_API}${botToken}/deleteWebhook`, { method: 'POST' });
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

/** Get webhook info */
export async function getWebhookInfo(botToken: string): Promise<any> {
  try {
    const res = await fetch(`${TELEGRAM_API}${botToken}/getWebhookInfo`);
    const data = await res.json();
    return data.result || {};
  } catch {
    return {};
  }
}

/** Get bot info */
export async function getTelegramBotInfo(customToken?: string): Promise<TelegramResponse> {
  const botToken = resolveBotToken(customToken);
  if (!botToken) return { ok: false, description: 'Bot token not configured' };

  try {
    const res = await fetch(`${TELEGRAM_API}${botToken}/getMe`);
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

// ─── Send Messages ───────────────────────────────────────────────────

/** Send a text message */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  parseMode: 'HTML' | 'Markdown' | 'MarkdownV2' = 'HTML',
  customToken?: string
): Promise<TelegramResponse> {
  const botToken = resolveBotToken(customToken);
  if (!botToken) return { ok: false, description: 'Bot token not configured' };

  try {
    const res = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: false,
      }),
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

/** Send a photo with caption */
export async function sendTelegramPhoto(
  chatId: string | number,
  photoUrl: string,
  caption?: string,
  customToken?: string
): Promise<TelegramResponse> {
  const botToken = resolveBotToken(customToken);
  if (!botToken) return { ok: false, description: 'Bot token not configured' };

  try {
    const res = await fetch(`${TELEGRAM_API}${botToken}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption: caption?.substring(0, 1024),
        parse_mode: 'HTML',
      }),
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

/** Send a video with caption */
export async function sendTelegramVideo(
  chatId: string | number,
  videoUrl: string,
  caption?: string,
  customToken?: string
): Promise<TelegramResponse> {
  const botToken = resolveBotToken(customToken);
  if (!botToken) return { ok: false, description: 'Bot token not configured' };

  try {
    const res = await fetch(`${TELEGRAM_API}${botToken}/sendVideo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        video: videoUrl,
        caption: caption?.substring(0, 1024),
        parse_mode: 'HTML',
      }),
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

/** Send a document */
export async function sendTelegramDocument(
  chatId: string | number,
  documentUrl: string,
  caption?: string,
  customToken?: string
): Promise<TelegramResponse> {
  const botToken = resolveBotToken(customToken);
  if (!botToken) return { ok: false, description: 'Bot token not configured' };

  try {
    const res = await fetch(`${TELEGRAM_API}${botToken}/sendDocument`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        document: documentUrl,
        caption: caption?.substring(0, 1024),
        parse_mode: 'HTML',
      }),
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

// ─── Broadcast ───────────────────────────────────────────────────────

export interface BroadcastResult {
  chatId: string | number;
  success: boolean;
  messageId?: number;
  error?: string;
}

/** Broadcast a message to multiple chats */
export async function broadcastToTelegram(
  chatIds: (string | number)[],
  content: { text: string; imageUrl?: string; videoUrl?: string; documentUrl?: string },
  customToken?: string,
  onProgress?: (result: BroadcastResult, index: number) => void
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const botToken = resolveBotToken(customToken);
  if (!botToken) return { sent: 0, failed: chatIds.length, errors: ['Bot token not configured'] };

  const results = { sent: 0, failed: 0, errors: [] as string[] };

  for (let i = 0; i < chatIds.length; i++) {
    const chatId = chatIds[i];
    try {
      let response: TelegramResponse;

      if (content.imageUrl) {
        response = await sendTelegramPhoto(chatId, content.imageUrl, content.text, customToken);
      } else if (content.videoUrl) {
        response = await sendTelegramVideo(chatId, content.videoUrl, content.text, customToken);
      } else if (content.documentUrl) {
        response = await sendTelegramDocument(chatId, content.documentUrl, content.text, customToken);
      } else {
        response = await sendTelegramMessage(chatId, content.text, 'HTML', customToken);
      }

      const br: BroadcastResult = {
        chatId,
        success: response.ok,
        messageId: response.result?.message_id,
        error: response.description,
      };
      if (response.ok) results.sent++;
      else { results.failed++; results.errors.push(`${chatId}: ${response.description}`); }
      onProgress?.(br, i);
    } catch (err: any) {
      results.failed++;
      results.errors.push(`${chatId}: ${err.message}`);
      onProgress?.({ chatId, success: false, error: err.message }, i);
    }

    // Telegram rate limit: ~30 msg/sec — play safe with 50ms delay
    if (i < chatIds.length - 1) await new Promise(r => setTimeout(r, 50));
  }

  return results;
}

// ─── Formatting Helpers ──────────────────────────────────────────────

/** Convert WhatsApp-style formatting to Telegram HTML */
export function convertToTelegramHTML(text: string): string {
  return text
    .replace(/\*([^*]+)\*/g, '<b>$1</b>')
    .replace(/_([^_]+)_/g, '<i>$1</i>')
    .replace(/~([^~]+)~/g, '<s>$1</s>')
    .replace(/```([^`]+)```/g, '<code>$1</code>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
