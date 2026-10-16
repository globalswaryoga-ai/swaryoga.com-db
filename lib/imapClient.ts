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

function isSpamOrPromo(subject: string, fromAddress: string, bodyText: string): boolean {
  const s = subject.toLowerCase();
  const f = fromAddress.toLowerCase();
  
  if (s.includes('undelivered mail') || s.includes('returned to sender') || s.includes('delivery status notification')) return true;
  if (f.includes('mailer-daemon') || f.includes('postmaster')) return true;
  
  return false;
}

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

export async function getImapConfig(): Promise<InboxConfig> {
  // 1. Direct IMAP environment variables
  if (process.env.GMAIL_IMAP_USER && process.env.GMAIL_IMAP_PASS) {
    return {
      host: process.env.GMAIL_IMAP_HOST || 'imap.hostinger.com',
      port: parseInt(process.env.GMAIL_IMAP_PORT || '993'),
      user: process.env.GMAIL_IMAP_USER,
      pass: process.env.GMAIL_IMAP_PASS,
      secure: true,
    };
  }

  // 2. Fall back to active verified email settings from database
  try {
    const { bunnyExecute } = await import('@/lib/bunnyDatabase');
    const res = await bunnyExecute(
      `SELECT * FROM email_settings_sql WHERE (is_active = 1 OR is_default = 1 OR is_verified = 1) AND smtp_pass IS NOT NULL AND smtp_pass != '' ORDER BY is_default DESC, is_verified DESC LIMIT 1`
    );
    if (res.rows.length > 0) {
      const row: any = res.rows[0];
      const smtpHost = String(row.smtp_host || 'smtp.hostinger.com').trim();
      let imapHost = smtpHost.replace(/^smtp\./i, 'imap.');
      if (imapHost === smtpHost && !imapHost.includes('imap')) {
        imapHost = `imap.${smtpHost}`;
      }
      return {
        host: process.env.GMAIL_IMAP_HOST || imapHost || 'imap.hostinger.com',
        port: parseInt(process.env.GMAIL_IMAP_PORT || '993'),
        user: String(row.smtp_user || row.sender_email || '').trim(),
        pass: String(row.smtp_pass || '').trim(),
        secure: true,
      };
    }
  } catch (err) {
    console.warn('[imap] Failed to load email settings from DB:', err);
  }

  // 3. Fall back to SMTP environment variables
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const smtpHost = String(process.env.SMTP_HOST || 'smtp.hostinger.com').trim();
    let imapHost = smtpHost.replace(/^smtp\./i, 'imap.');
    return {
      host: process.env.GMAIL_IMAP_HOST || imapHost || 'imap.hostinger.com',
      port: parseInt(process.env.GMAIL_IMAP_PORT || '993'),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      secure: true,
    };
  }

  return {
    host: process.env.GMAIL_IMAP_HOST || 'imap.hostinger.com',
    port: parseInt(process.env.GMAIL_IMAP_PORT || '993'),
    user: '',
    pass: '',
    secure: true,
  };
}

export async function isImapConfigured(): Promise<boolean> {
  const config = await getImapConfig();
  return !!(config.user && config.pass);
}

export async function getImapUser(): Promise<string> {
  const config = await getImapConfig();
  return config.user;
}

async function createClient(): Promise<ImapFlow> {
  const config = await getImapConfig();
  if (!config.user || !config.pass) {
    throw new Error('IMAP inbox not configured. Please configure your email in Email Settings or environment variables.');
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
          const subject = envelope?.subject || '(No Subject)';
          const fromAddress = fromAddr?.address || '';

          if (isSpamOrPromo(subject, fromAddress, snippet)) {
            // Skip promotional or spam emails
            continue;
          }

          emails.push({
            uid: msg.uid,
            messageId: envelope?.messageId || '',
            from: {
              name: fromAddr?.name || fromAddress || 'Unknown',
              address: fromAddress,
            },
            to: toAddrs,
            subject,
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
