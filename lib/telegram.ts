/**
 * Telegram Bot API Integration
 * 
 * Setup:
 * 1. Create a bot via @BotFather on Telegram
 * 2. Get the bot token
 * 3. Add bot as admin to your channel/groups
 * 4. Set TELEGRAM_BOT_TOKEN in .env.local
 */

import axios from 'axios';

const TELEGRAM_API = 'https://api.telegram.org/bot';

interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
}

/**
 * Send a text message to a Telegram chat (channel or group)
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: 'HTML' | 'Markdown' | 'MarkdownV2' = 'HTML'
): Promise<TelegramResponse> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('[Telegram] Missing TELEGRAM_BOT_TOKEN');
    return { ok: false, description: 'Bot token not configured' };
  }

  try {
    const response = await axios.post(`${TELEGRAM_API}${botToken}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: false,
    });
    
    return response.data;
  } catch (error: any) {
    console.error('[Telegram] Send message error:', error.response?.data || error.message);
    return { 
      ok: false, 
      description: error.response?.data?.description || error.message 
    };
  }
}

/**
 * Send a photo with caption to a Telegram chat
 */
export async function sendTelegramPhoto(
  chatId: string,
  photoUrl: string,
  caption?: string
): Promise<TelegramResponse> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    return { ok: false, description: 'Bot token not configured' };
  }

  try {
    const response = await axios.post(`${TELEGRAM_API}${botToken}/sendPhoto`, {
      chat_id: chatId,
      photo: photoUrl,
      caption: caption?.substring(0, 1024), // Telegram caption limit
      parse_mode: 'HTML',
    });
    
    return response.data;
  } catch (error: any) {
    console.error('[Telegram] Send photo error:', error.response?.data || error.message);
    return { 
      ok: false, 
      description: error.response?.data?.description || error.message 
    };
  }
}

/**
 * Send a video with caption to a Telegram chat
 */
export async function sendTelegramVideo(
  chatId: string,
  videoUrl: string,
  caption?: string
): Promise<TelegramResponse> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    return { ok: false, description: 'Bot token not configured' };
  }

  try {
    const response = await axios.post(`${TELEGRAM_API}${botToken}/sendVideo`, {
      chat_id: chatId,
      video: videoUrl,
      caption: caption?.substring(0, 1024),
      parse_mode: 'HTML',
    });
    
    return response.data;
  } catch (error: any) {
    console.error('[Telegram] Send video error:', error.response?.data || error.message);
    return { 
      ok: false, 
      description: error.response?.data?.description || error.message 
    };
  }
}

/**
 * Send a document to a Telegram chat
 */
export async function sendTelegramDocument(
  chatId: string,
  documentUrl: string,
  caption?: string
): Promise<TelegramResponse> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    return { ok: false, description: 'Bot token not configured' };
  }

  try {
    const response = await axios.post(`${TELEGRAM_API}${botToken}/sendDocument`, {
      chat_id: chatId,
      document: documentUrl,
      caption: caption?.substring(0, 1024),
      parse_mode: 'HTML',
    });
    
    return response.data;
  } catch (error: any) {
    console.error('[Telegram] Send document error:', error.response?.data || error.message);
    return { 
      ok: false, 
      description: error.response?.data?.description || error.message 
    };
  }
}

/**
 * Broadcast a message to multiple Telegram chats (channel + groups)
 */
export async function broadcastToTelegram(
  chatIds: string[],
  content: {
    text: string;
    imageUrl?: string;
    videoUrl?: string;
  }
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] };
  
  for (const chatId of chatIds) {
    try {
      let response: TelegramResponse;
      
      if (content.imageUrl) {
        response = await sendTelegramPhoto(chatId, content.imageUrl, content.text);
      } else if (content.videoUrl) {
        response = await sendTelegramVideo(chatId, content.videoUrl, content.text);
      } else {
        response = await sendTelegramMessage(chatId, content.text);
      }
      
      if (response.ok) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`${chatId}: ${response.description}`);
      }
      
      // Rate limit: Telegram allows ~30 messages per second, but be safe
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      results.failed++;
      results.errors.push(`${chatId}: ${error.message}`);
    }
  }
  
  return results;
}

/**
 * Get bot info (useful for testing connection)
 */
export async function getTelegramBotInfo(): Promise<TelegramResponse> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    return { ok: false, description: 'Bot token not configured' };
  }

  try {
    const response = await axios.get(`${TELEGRAM_API}${botToken}/getMe`);
    return response.data;
  } catch (error: any) {
    return { 
      ok: false, 
      description: error.response?.data?.description || error.message 
    };
  }
}

/**
 * Convert WhatsApp-style formatting to Telegram HTML
 * *bold* -> <b>bold</b>
 * _italic_ -> <i>italic</i>
 * ~strike~ -> <s>strike</s>
 * ```code``` -> <code>code</code>
 */
export function convertToTelegramHTML(text: string): string {
  return text
    .replace(/\*([^*]+)\*/g, '<b>$1</b>')
    .replace(/_([^_]+)_/g, '<i>$1</i>')
    .replace(/~([^~]+)~/g, '<s>$1</s>')
    .replace(/```([^`]+)```/g, '<code>$1</code>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
