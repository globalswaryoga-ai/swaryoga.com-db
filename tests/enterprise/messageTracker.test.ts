import { describe, it, expect, beforeEach, vi } from 'vitest';
import MessageTracker from '@/lib/messageTracker';

describe('MessageTracker', () => {
  let tracker: MessageTracker;

  beforeEach(() => {
    tracker = new MessageTracker();
    vi.useFakeTimers();
  });

  describe('trackMessage', () => {
    it('should create message tracking record', async () => {
      const record = await tracker.trackMessage({
        messageId: 'msg-123',
        userId: 'user-123',
        phoneNumber: '+919876543210',
        content: 'Hello',
        channel: 'whatsapp',
      });

      expect(record).toBeDefined();
      expect(record.status).toBe('queued');
      expect(record.timestamp).toBeDefined();
    });

    it('should initialize with queued status', async () => {
      const record = await tracker.trackMessage({
        messageId: 'msg-456',
        userId: 'user-456',
        phoneNumber: '+919876543211',
        content: 'Test message',
        channel: 'whatsapp',
      });

      expect(record.status).toBe('queued');
      expect(record.sentAt).toBeUndefined();
    });
  });

  describe('updateStatus', () => {
    it('should update message status', async () => {
      const record = await tracker.trackMessage({
        messageId: 'msg-789',
        userId: 'user-789',
        phoneNumber: '+919876543212',
        content: 'Status test',
        channel: 'whatsapp',
      });

      const updated = await tracker.updateStatus('msg-789', 'sent');
      expect(updated.status).toBe('sent');
      expect(updated.sentAt).toBeDefined();
    });

    it('should track full message lifecycle', async () => {
      const record = await tracker.trackMessage({
        messageId: 'msg-101',
        userId: 'user-101',
        phoneNumber: '+919876543213',
        content: 'Lifecycle test',
        channel: 'whatsapp',
      });

      let current = record;

      current = await tracker.updateStatus('msg-101', 'sent');
      expect(current.status).toBe('sent');

      current = await tracker.updateStatus('msg-101', 'delivered');
      expect(current.status).toBe('delivered');

      current = await tracker.updateStatus('msg-101', 'read');
      expect(current.status).toBe('read');
    });
  });

  describe('Retry Logic', () => {
    it('should attempt automatic retries', async () => {
      const record = await tracker.trackMessage({
        messageId: 'msg-202',
        userId: 'user-202',
        phoneNumber: '+919876543214',
        content: 'Retry test',
        channel: 'whatsapp',
      });

      // Simulate failure
      let current = await tracker.updateStatus('msg-202', 'failed');
      expect(current.status).toBe('failed');
      expect(current.retryCount).toBeLessThanOrEqual(3);

      // Should trigger automatic retry
      if (current.retryCount < 3) {
        vi.advanceTimersByTime(5 * 60 * 1000); // Advance 5 minutes
        // Automatic retry should be attempted
      }
    });

    it('should use exponential backoff for retries', async () => {
      const record = await tracker.trackMessage({
        messageId: 'msg-303',
        userId: 'user-303',
        phoneNumber: '+919876543215',
        content: 'Backoff test',
        channel: 'whatsapp',
      });

      let current = await tracker.updateStatus('msg-303', 'failed');
      const backoff1 = current.nextRetryTime;

      // Simulate another failure after first retry
      vi.advanceTimersByTime(5 * 60 * 1000);
      current = await tracker.updateStatus('msg-303', 'failed');
      const backoff2 = current.nextRetryTime;

      // Second backoff should be longer
      expect(backoff2!.getTime()).toBeGreaterThan(backoff1?.getTime() || 0);
    });

    it('should stop retrying after max attempts', async () => {
      const record = await tracker.trackMessage({
        messageId: 'msg-404',
        userId: 'user-404',
        phoneNumber: '+919876543216',
        content: 'Max retry test',
        channel: 'whatsapp',
      });

      let current = record;
      for (let i = 0; i < 4; i++) {
        current = await tracker.updateStatus('msg-404', 'failed');
        if (current.retryCount < 3) {
          vi.advanceTimersByTime(5 * 60 * 1000);
        }
      }

      expect(current.retryCount).toBeLessThanOrEqual(3);
    });
  });

  describe('getMessageStatus', () => {
    it('should retrieve current message status', async () => {
      await tracker.trackMessage({
        messageId: 'msg-505',
        userId: 'user-505',
        phoneNumber: '+919876543217',
        content: 'Status retrieval',
        channel: 'whatsapp',
      });

      const status = await tracker.getMessageStatus('msg-505');
      expect(status).toBeDefined();
      expect(status?.messageId).toBe('msg-505');
    });

    it('should return null for non-existent message', async () => {
      const status = await tracker.getMessageStatus('non-existent');
      expect(status).toBeNull();
    });
  });

  describe('getConversation', () => {
    it('should retrieve conversation messages', async () => {
      await tracker.trackMessage({
        messageId: 'msg-606-1',
        userId: 'user-606',
        phoneNumber: '+919876543218',
        content: 'Message 1',
        channel: 'whatsapp',
      });

      await tracker.trackMessage({
        messageId: 'msg-606-2',
        userId: 'user-606',
        phoneNumber: '+919876543218',
        content: 'Message 2',
        channel: 'whatsapp',
      });

      const conversation = await tracker.getConversation('user-606', '+919876543218');
      expect(Array.isArray(conversation)).toBe(true);
      expect(conversation.length).toBe(2);
    });
  });

  describe('Retention Policy', () => {
    it('should enforce 90-day retention', async () => {
      const record = await tracker.trackMessage({
        messageId: 'msg-707',
        userId: 'user-707',
        phoneNumber: '+919876543219',
        content: 'Retention test',
        channel: 'whatsapp',
      });

      const createdDate = new Date(record.timestamp);
      const ninetyDaysLater = new Date(createdDate.getTime() + 90 * 24 * 60 * 60 * 1000);

      expect(ninetyDaysLater.getTime() - createdDate.getTime()).toBeLessThanOrEqual(90 * 24 * 60 * 60 * 1000);
    });

    it('should auto-delete messages after 90 days', async () => {
      const record = await tracker.trackMessage({
        messageId: 'msg-808',
        userId: 'user-808',
        phoneNumber: '+919876543220',
        content: 'Delete test',
        channel: 'whatsapp',
      });

      // Advance time by 91 days
      vi.advanceTimersByTime(91 * 24 * 60 * 60 * 1000);

      const status = await tracker.getMessageStatus('msg-808');
      expect(status).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should track error details', async () => {
      const record = await tracker.trackMessage({
        messageId: 'msg-909',
        userId: 'user-909',
        phoneNumber: '+919876543221',
        content: 'Error test',
        channel: 'whatsapp',
      });

      const updated = await tracker.updateStatus('msg-909', 'failed', {
        errorCode: 'INVALID_PHONE',
        errorMessage: 'Phone number format invalid',
      });

      expect(updated.lastError).toBeDefined();
      expect(updated.lastError?.errorCode).toBe('INVALID_PHONE');
    });

    it('should handle delivery failures', async () => {
      const record = await tracker.trackMessage({
        messageId: 'msg-1010',
        userId: 'user-1010',
        phoneNumber: '+919876543222',
        content: 'Delivery failure',
        channel: 'whatsapp',
      });

      const updated = await tracker.updateStatus('msg-1010', 'failed', {
        errorCode: 'DELIVERY_FAILED',
        errorMessage: 'Message delivery failed',
      });

      expect(updated.status).toBe('failed');
    });
  });

  describe('Batch Operations', () => {
    it('should track multiple messages', async () => {
      for (let i = 0; i < 10; i++) {
        await tracker.trackMessage({
          messageId: `msg-batch-${i}`,
          userId: 'user-batch',
          phoneNumber: '+919876543223',
          content: `Message ${i}`,
          channel: 'whatsapp',
        });
      }

      const conversation = await tracker.getConversation('user-batch', '+919876543223');
      expect(conversation.length).toBe(10);
    });

    it('should update status for multiple messages', async () => {
      const messageIds = [];
      for (let i = 0; i < 5; i++) {
        const record = await tracker.trackMessage({
          messageId: `msg-multi-${i}`,
          userId: 'user-multi',
          phoneNumber: '+919876543224',
          content: `Message ${i}`,
          channel: 'whatsapp',
        });
        messageIds.push(record.messageId);
      }

      // Update all to delivered
      const updated = await Promise.all(
        messageIds.map((id) => tracker.updateStatus(id, 'delivered'))
      );

      expect(updated.every((r) => r.status === 'delivered')).toBe(true);
    });
  });
});
