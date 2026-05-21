/**
 * Message Deduplication System
 *
 * Prevents:
 * 1. Same message sent to same user multiple times in a day
 * 2. Duplicate messages from being sent
 * 3. User receiving same message content twice
 *
 * Solution: Track sent messages in MongoDB with date key
 */

interface MessageRecord {
  _id?: string;
  userId: string;
  chatId: string;
  messageHash: string; // Hash of message content
  messageText: string;
  scheduleId: string;
  sentAt: Date;
  dayKey: string; // YYYY-MM-DD
}

/**
 * Generate hash from message content
 * Same text = same hash (detects duplicates)
 */
export function hashMessage(messageText: string): string {
  // Simple hash: first 50 chars + length + md5-like calculation
  const text = messageText.trim().toLowerCase();
  const hash =
    text.substring(0, 50) +
    '_' +
    text.length +
    '_' +
    text.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a; // Convert to 32bit integer
    }, 0);
  return Math.abs(parseInt(hash.split('_')[2]) || 0).toString(16);
}

/**
 * Get day key for today (YYYY-MM-DD format)
 * Used to track messages sent per day
 */
export function getDayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if message already sent to user today
 * Returns: { canSend: boolean, reason?: string }
 */
export async function canSendMessageToUser(
  userId: string,
  chatId: string,
  messageText: string,
  db: any
): Promise<{
  canSend: boolean;
  reason?: string;
  previouslySentAt?: Date;
}> {
  try {
    const collection = db.collection('message_dedup_log');
    const messageHash = hashMessage(messageText);
    const dayKey = getDayKey();

    // Check if this message was already sent to this user today
    const existing = await collection.findOne({
      userId,
      chatId,
      messageHash,
      dayKey,
    });

    if (existing) {
      return {
        canSend: false,
        reason: `Message already sent to this user today (${existing.sentAt.toLocaleTimeString()})`,
        previouslySentAt: existing.sentAt,
      };
    }

    return { canSend: true };
  } catch (error) {
    console.error('[Message Dedup] Error checking message:', error);
    // On error, allow send (fail open, don't block)
    return { canSend: true };
  }
}

/**
 * Record message as sent
 * Call AFTER successfully sending message
 */
export async function recordMessageSent(
  userId: string,
  chatId: string,
  messageText: string,
  scheduleId: string,
  db: any
): Promise<boolean> {
  try {
    const collection = db.collection('message_dedup_log');
    const messageHash = hashMessage(messageText);
    const dayKey = getDayKey();

    await collection.insertOne({
      userId,
      chatId,
      messageHash,
      messageText,
      scheduleId,
      sentAt: new Date(),
      dayKey,
    });

    console.log(
      `[Message Dedup] Recorded: ${chatId} on ${dayKey} (hash: ${messageHash})`
    );
    return true;
  } catch (error) {
    console.error('[Message Dedup] Error recording message:', error);
    return false;
  }
}

/**
 * Get today's sent messages for user
 * For UI display and monitoring
 */
export async function getTodaysSentMessages(
  userId: string,
  db: any
): Promise<
  Array<{
    chatId: string;
    messageText: string;
    sentAt: Date;
    scheduleId: string;
  }>
> {
  try {
    const collection = db.collection('message_dedup_log');
    const dayKey = getDayKey();

    const messages = await collection
      .find({
        userId,
        dayKey,
      })
      .sort({ sentAt: -1 })
      .toArray();

    return messages.map((m) => ({
      chatId: m.chatId,
      messageText: m.messageText,
      sentAt: m.sentAt,
      scheduleId: m.scheduleId,
    }));
  } catch (error) {
    console.error('[Message Dedup] Error fetching messages:', error);
    return [];
  }
}

/**
 * Check if ANY scheduled message was sent to this user today
 * (to prevent message spam even from different schedules)
 */
export async function hasUserReceivedMessageToday(
  userId: string,
  chatId: string,
  db: any
): Promise<{
  received: boolean;
  count: number;
  lastMessage?: { text: string; time: Date };
}> {
  try {
    const collection = db.collection('message_dedup_log');
    const dayKey = getDayKey();

    const messages = await collection
      .find({
        userId,
        chatId,
        dayKey,
      })
      .sort({ sentAt: -1 })
      .toArray();

    if (messages.length === 0) {
      return { received: false, count: 0 };
    }

    return {
      received: true,
      count: messages.length,
      lastMessage: {
        text: messages[0].messageText,
        time: messages[0].sentAt,
      },
    };
  } catch (error) {
    console.error('[Message Dedup] Error checking user:', error);
    return { received: false, count: 0 };
  }
}

/**
 * Get deduplication stats for monitoring
 */
export async function getDeduplicationStats(userId: string, db: any): Promise<{
  totalSentToday: number;
  uniqueChatsToday: number;
  totalSentAllTime: number;
  topMessages: Array<{ text: string; count: number }>;
}> {
  try {
    const collection = db.collection('message_dedup_log');
    const dayKey = getDayKey();

    // Today's stats
    const todayMessages = await collection.find({ userId, dayKey }).toArray();

    const uniqueChats = new Set(todayMessages.map((m) => m.chatId)).size;

    // All-time stats
    const allMessages = await collection.find({ userId }).toArray();

    // Top messages
    const messageFreq: Record<string, number> = {};
    allMessages.forEach((m) => {
      messageFreq[m.messageText] = (messageFreq[m.messageText] || 0) + 1;
    });

    const topMessages = Object.entries(messageFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text, count]) => ({
        text: text.substring(0, 100),
        count,
      }));

    return {
      totalSentToday: todayMessages.length,
      uniqueChatsToday: uniqueChats,
      totalSentAllTime: allMessages.length,
      topMessages,
    };
  } catch (error) {
    console.error('[Message Dedup] Error getting stats:', error);
    return {
      totalSentToday: 0,
      uniqueChatsToday: 0,
      totalSentAllTime: 0,
      topMessages: [],
    };
  }
}

/**
 * Clean up old records (keep last 30 days)
 * Run daily to prevent collection from growing too large
 */
export async function cleanupOldRecords(db: any): Promise<number> {
  try {
    const collection = db.collection('message_dedup_log');

    // Delete records older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await collection.deleteMany({
      sentAt: { $lt: thirtyDaysAgo },
    });

    console.log(
      `[Message Dedup] Cleaned up ${result.deletedCount} old records`
    );
    return result.deletedCount;
  } catch (error) {
    console.error('[Message Dedup] Error cleaning up:', error);
    return 0;
  }
}

/**
 * Get messages sent to specific user in date range
 * For analytics and user reports
 */
export async function getMessageHistory(
  userId: string,
  chatId: string,
  startDate: Date,
  endDate: Date,
  db: any
): Promise<MessageRecord[]> {
  try {
    const collection = db.collection('message_dedup_log');

    const messages = await collection
      .find({
        userId,
        chatId,
        sentAt: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ sentAt: -1 })
      .toArray();

    return messages;
  } catch (error) {
    console.error('[Message Dedup] Error getting history:', error);
    return [];
  }
}
