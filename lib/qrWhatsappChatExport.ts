/**
 * Builds an on-demand, human-readable export of a tenant's QR WhatsApp chat
 * history — merges whatever's still "hot" in Mongo with whatever's already
 * archived to Bunny (see lib/qrWhatsappArchive.ts), so a user can download
 * their own data at any time regardless of which tier it currently lives in.
 *
 * Tenant isolation: every query here is scoped by the exact (userId,
 * connectedPhone) pair passed in — never a cross-tenant read.
 */
import { connectDB } from '@/lib/db';
import { fetchFromStorage } from '@/lib/bunny-storage';
import { getQrWhatsAppMessage, getQrWhatsAppChat, getQrWhatsappArchiveManifest } from '@/lib/schemas/enterpriseSchemas';
import type { ArchivedMessage } from './qrWhatsappArchive';

// Keeps the export responsive within a serverless function's time budget —
// a user with years of history can re-download for older data separately
// once we add date-range filtering; this cap just prevents a single request
// from ballooning indefinitely.
const MAX_MESSAGES_PER_EXPORT = 20000;

export type ExportChat = {
  chatJid: string;
  name: string;
  isGroup: boolean;
  messages: { timestamp: number; fromMe: boolean; sender: string; text: string }[];
};

export async function buildChatHistoryExport(
  userId: string,
  connectedPhone: string
): Promise<{ chats: ExportChat[]; truncated: boolean; totalMessages: number }> {
  await connectDB();
  const QrMsg = getQrWhatsAppMessage();
  const QrChat = getQrWhatsAppChat();
  const Manifest = getQrWhatsappArchiveManifest();

  const chatDocs = await QrChat.find({ userId, connectedPhone }).lean();
  const nameByJid = new Map(
    chatDocs.map((c: any) => [c.chatJid, { name: c.name || c.chatJid, isGroup: !!c.isGroup }])
  );

  const byChat = new Map<string, ExportChat>();
  let total = 0;
  let truncated = false;

  function pushMsg(
    chatJid: string,
    m: { timestamp: number; fromMe: boolean; participant?: string; pushName?: string; text: string }
  ) {
    if (total >= MAX_MESSAGES_PER_EXPORT) {
      truncated = true;
      return;
    }
    if (!byChat.has(chatJid)) {
      const meta = nameByJid.get(chatJid);
      byChat.set(chatJid, {
        chatJid,
        name: meta?.name || chatJid.split('@')[0],
        isGroup: meta?.isGroup ?? chatJid.endsWith('@g.us'),
        messages: [],
      });
    }
    byChat.get(chatJid)!.messages.push({
      timestamp: m.timestamp,
      fromMe: m.fromMe,
      sender: m.fromMe ? 'You' : m.pushName || m.participant || 'Contact',
      text: m.text,
    });
    total++;
  }

  // 1. Hot Mongo messages — not yet swept into Bunny by the daily archive cron.
  const hotMessages = await QrMsg.find({ userId, connectedPhone }).sort({ timestamp: 1 }).lean();
  for (const doc of hotMessages as any[]) {
    pushMsg(doc.chatJid, {
      timestamp: doc.timestamp,
      fromMe: !!doc.fromMe,
      participant: doc.participant,
      pushName: doc.pushName,
      text: doc.text || (doc.hasMedia ? `[${doc.type || 'media'}]` : ''),
    });
  }

  // 2. Archived Bunny messages.
  const manifestEntries = await Manifest.find({ userId, connectedPhone }).sort({ dateKey: 1 }).lean();
  for (const entry of manifestEntries as any[]) {
    if (total >= MAX_MESSAGES_PER_EXPORT) {
      truncated = true;
      break;
    }
    try {
      const { buffer } = await fetchFromStorage(entry.bunnyPath);
      const archived: ArchivedMessage[] = JSON.parse(buffer.toString('utf-8'));
      for (const m of archived) {
        pushMsg(entry.chatJid, {
          timestamp: m.timestamp,
          fromMe: m.fromMe,
          participant: m.participant,
          pushName: m.pushName,
          text: m.text || (m.hasMedia ? `[${m.type || 'media'}]` : ''),
        });
      }
    } catch (e) {
      console.warn(`[ChatExport] Failed to read ${entry.bunnyPath}:`, e instanceof Error ? e.message : e);
    }
  }

  for (const chat of byChat.values()) chat.messages.sort((a, b) => a.timestamp - b.timestamp);

  const chats = Array.from(byChat.values()).sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1]?.timestamp || 0;
    const bLast = b.messages[b.messages.length - 1]?.timestamp || 0;
    return bLast - aLast;
  });

  return { chats, truncated, totalMessages: total };
}

export function renderChatHistoryHtml(connectedPhone: string, chats: ExportChat[], truncated: boolean): string {
  const esc = (s: string) =>
    String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const chatsHtml = chats
    .map(
      (chat) => `
    <details class="chat">
      <summary>${esc(chat.name)}${chat.isGroup ? ' (group)' : ''} — ${chat.messages.length} messages</summary>
      <div class="messages">
        ${chat.messages
          .map(
            (m) => `
          <div class="msg ${m.fromMe ? 'out' : 'in'}">
            <span class="meta">${esc(m.sender)} · ${new Date(m.timestamp * 1000).toLocaleString()}</span>
            <div class="text">${esc(m.text)}</div>
          </div>`
          )
          .join('')}
      </div>
    </details>`
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>WhatsApp Chat History — ${esc(connectedPhone)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 20px auto; padding: 0 16px; color: #222; background: #f7f7f8; }
  h1 { font-size: 18px; }
  .chat { border: 1px solid #ddd; border-radius: 8px; margin-bottom: 12px; padding: 8px 12px; background: #fff; }
  summary { cursor: pointer; font-weight: 600; padding: 6px 0; }
  .messages { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
  .msg { padding: 6px 10px; border-radius: 8px; max-width: 80%; }
  .msg.out { background: #dcf8c6; align-self: flex-end; }
  .msg.in { background: #f1f0f0; align-self: flex-start; }
  .meta { font-size: 11px; color: #667; display: block; margin-bottom: 2px; }
  .text { white-space: pre-wrap; word-break: break-word; }
  .note { font-size: 12px; color: #999; margin-top: 20px; }
</style>
</head><body>
  <h1>WhatsApp Chat History — ${esc(connectedPhone)}</h1>
  <p style="font-size:12px;color:#888;">Exported on ${new Date().toLocaleString()} · ${chats.length} chats</p>
  ${chatsHtml}
  ${truncated ? '<p class="note">Export capped at 20,000 messages for this download — the rest of your history remains safely archived; download again for more.</p>' : ''}
</body></html>`;
}
