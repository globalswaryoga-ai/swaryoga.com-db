/**
 * Gmail IMAP Client
 * Fetches emails from Gmail inbox using IMAP protocol.
 *
 * Setup:
 *   1. Enable 2-Step Verification on your Google Account
 *   2. Go to https://myaccount.google.com/apppasswords
 *   3. Generate an App Password for "Mail"
 *   4. Set env vars: GMAIL_IMAP_USER, GMAIL_IMAP_PASS (app password)
 */

import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';

export interface InboxEmail {
  uid: number;
  messageId: string;
  from: { name: string; address: string };
  to: string[];
  subject: string;
  date: string;
  snippet: string;
  body: string;
  isRead: boolean;
  hasAttachments: boolean;
  attachments: { filename: string; size: number; contentType: string }[];
  labels: string[];
  folder: string;
}

export interface InboxConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
}

function getImapConfig(): InboxConfig {
  return {
    host: process.env.GMAIL_IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.GMAIL_IMAP_PORT || '993'),
    user: process.env.GMAIL_IMAP_USER || '',
    pass: process.env.GMAIL_IMAP_PASS || '',
    secure: true,
  };
}

export function isImapConfigured(): boolean {
  const config = getImapConfig();
  return !!(config.user && config.pass);
}

export function getImapUser(): string {
  return getImapConfig().user;
}

async function createClient(): Promise<ImapFlow> {
  const config = getImapConfig();
  if (!config.user || !config.pass) {
    throw new Error('Gmail IMAP not configured. Set GMAIL_IMAP_USER and GMAIL_IMAP_PASS.');
  }

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    logger: false,
  });

  await client.connect();
  return client;
}

/**
 * Fetch emails from a mailbox folder
 */
export async function fetchEmails(options: {
  folder?: string;
  limit?: number;
  page?: number;
  search?: string;
  unreadOnly?: boolean;
}): Promise<{ emails: InboxEmail[]; total: number; unread: number }> {
  const { folder = 'INBOX', limit = 25, page = 0, search, unreadOnly = false } = options;

  const client = await createClient();

  try {
    const lock = await client.getMailboxLock(folder);

    try {
      const mailbox = client.mailbox;
      const mbx = mailbox as any;
      const total: number = mbx?.exists ?? 0;
      const unreadCount: number = mbx?.unseen ?? 0;

      if (total === 0) {
        return { emails: [], total: 0, unread: 0 };
      }

      // Build search query
      let searchQuery: any = {};
      if (unreadOnly) {
        searchQuery.seen = false;
      }
      if (search) {
        searchQuery.or = [
          { subject: search },
          { from: search },
          { body: search },
        ];
      }

      // Use search if we have criteria, otherwise get all
      let uids: number[];
      if (Object.keys(searchQuery).length > 0) {
        const searchResult = await client.search(searchQuery, { uid: true });
        uids = searchResult as number[];
      } else {
        // Get all message sequence numbers, then convert
        const searchResult = await client.search({ all: true }, { uid: true });
        uids = searchResult as number[];
      }

      // Sort descending (newest first) and paginate
      uids.sort((a, b) => b - a);
      const totalMatched = uids.length;
      const start = page * limit;
      const pageUids = uids.slice(start, start + limit);

      if (pageUids.length === 0) {
        return { emails: [], total: totalMatched, unread: unreadCount };
      }

      const emails: InboxEmail[] = [];

      // Fetch messages
      for (const uid of pageUids) {
        try {
          const msg = await client.fetchOne(String(uid), {
            uid: true,
            envelope: true,
            flags: true,
            bodyStructure: true,
            source: true,
          }, { uid: true });

          if (!msg) continue;

          const envelope = msg.envelope;
          const flags = msg.flags || new Set();
          const isRead = flags.has('\\Seen');

          // Parse the full email for body content
          let body = '';
          let snippet = '';
          const attachmentsList: { filename: string; size: number; contentType: string }[] = [];

          if (msg.source) {
            try {
              const parsed: ParsedMail = await simpleParser(msg.source);
              body = parsed.html || parsed.text || '';
              snippet = (parsed.text || '').substring(0, 200).replace(/\s+/g, ' ').trim();

              if (parsed.attachments?.length) {
                for (const att of parsed.attachments) {
                  attachmentsList.push({
                    filename: att.filename || 'unknown',
                    size: att.size || 0,
                    contentType: att.contentType || 'application/octet-stream',
                  });
                }
              }
            } catch {
              snippet = '';
            }
          }

          const fromAddr = envelope?.from?.[0];
          const toAddrs = envelope?.to?.map((t: any) => t.address || '') || [];

          emails.push({
            uid: msg.uid,
            messageId: envelope?.messageId || '',
            from: {
              name: fromAddr?.name || fromAddr?.address || 'Unknown',
              address: fromAddr?.address || '',
            },
            to: toAddrs,
            subject: envelope?.subject || '(No Subject)',
            date: envelope?.date ? new Date(envelope.date).toISOString() : new Date().toISOString(),
            snippet,
            body,
            isRead,
            hasAttachments: attachmentsList.length > 0,
            attachments: attachmentsList,
            labels: [],
            folder,
          });
        } catch (e) {
          console.warn(`[imap] Failed to fetch UID ${uid}:`, e);
        }
      }

      return { emails, total: totalMatched, unread: unreadCount };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

/**
 * Get a single email by UID
 */
export async function fetchEmailByUid(uid: number, folder: string = 'INBOX'): Promise<InboxEmail | null> {
  const client = await createClient();

  try {
    const lock = await client.getMailboxLock(folder);

    try {
      const msg = await client.fetchOne(String(uid), {
        uid: true,
        envelope: true,
        flags: true,
        source: true,
      }, { uid: true });

      if (!msg) return null;

      const envelope = msg.envelope;
      const flags = msg.flags || new Set();

      let body = '';
      let snippet = '';
      const attachmentsList: { filename: string; size: number; contentType: string }[] = [];

      if (msg.source) {
        try {
          const parsed = await simpleParser(msg.source);
          body = parsed.html || parsed.text || '';
          snippet = (parsed.text || '').substring(0, 200).replace(/\s+/g, ' ').trim();

          if (parsed.attachments?.length) {
            for (const att of parsed.attachments) {
              attachmentsList.push({
                filename: att.filename || 'unknown',
                size: att.size || 0,
                contentType: att.contentType || 'application/octet-stream',
              });
            }
          }
        } catch { /* ignore */ }
      }

      // Mark as read
      await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });

      const fromAddr = envelope?.from?.[0];

      return {
        uid: msg.uid,
        messageId: envelope?.messageId || '',
        from: {
          name: fromAddr?.name || fromAddr?.address || 'Unknown',
          address: fromAddr?.address || '',
        },
        to: envelope?.to?.map((t: any) => t.address || '') || [],
        subject: envelope?.subject || '(No Subject)',
        date: envelope?.date ? new Date(envelope.date).toISOString() : new Date().toISOString(),
        snippet,
        body,
        isRead: true,
        hasAttachments: attachmentsList.length > 0,
        attachments: attachmentsList,
        labels: [],
        folder,
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

/**
 * Mark email as read/unread
 */
export async function markEmailRead(uid: number, read: boolean, folder: string = 'INBOX'): Promise<void> {
  const client = await createClient();

  try {
    const lock = await client.getMailboxLock(folder);
    try {
      if (read) {
        await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
      } else {
        await client.messageFlagsRemove(String(uid), ['\\Seen'], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

/**
 * Delete email (move to trash)
 */
export async function deleteEmail(uid: number, folder: string = 'INBOX'): Promise<void> {
  const client = await createClient();

  try {
    const lock = await client.getMailboxLock(folder);
    try {
      await client.messageDelete(String(uid), { uid: true });
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

/**
 * List available mail folders
 */
export async function listFolders(): Promise<string[]> {
  const client = await createClient();

  try {
    const folders: string[] = [];
    const list = await client.list();
    for (const folder of list) {
      folders.push(folder.path);
    }
    return folders;
  } finally {
    await client.logout();
  }
}
