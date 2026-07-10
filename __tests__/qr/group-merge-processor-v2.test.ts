/**
 * @jest-environment node
 *
 * Tests for the group-merge V2 cron processor:
 * - jobs paused by a disconnect auto-resume when the session is healthy again
 * - transient bridge/network errors retry the SAME member (no skip, no
 *   failure-breaker count); permanent WhatsApp rejections skip and count
 * - status transitions pending/paused -> in-progress
 */

jest.mock('@/lib/db', () => ({ connectDB: jest.fn() }));

jest.mock('@/lib/qrTimeGuard', () => ({
  isQRSendAllowed: () => true,
  getCurrentISTTime: () => '12:00 PM IST',
}));

// In-memory stand-in for the merge_group_v2_queue collection
let docs: any[] = [];

function applyUpdate(doc: any, update: any) {
  if (update.$set) Object.assign(doc, update.$set);
  if (update.$unset) for (const k of Object.keys(update.$unset)) delete doc[k];
}

const fakeCollection = {
  find: (query: any) => ({
    toArray: async () => docs.filter((d) => query.status.$in.includes(d.status)),
  }),
  updateOne: async (filter: any, update: any) => {
    const doc = docs.find((d) => d._id === filter._id);
    if (doc) applyUpdate(doc, update);
    return { matchedCount: doc ? 1 : 0 };
  },
};

jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    connection: { db: { collection: () => fakeCollection } },
  },
}));

import { GET } from '@/app/api/cron/group-merge-processor-v2/route';

const CRON_SECRET = 'test-cron-secret';

function makeReq() {
  return {
    headers: { get: () => null },
    nextUrl: new URL(`http://localhost/api/cron/group-merge-processor-v2?secret=${CRON_SECRET}`),
  } as any;
}

function makeJob(overrides: Record<string, any> = {}) {
  const now = new Date();
  return {
    _id: 'job-1',
    userId: 'user-1',
    sessionKey: 'tenant-1',
    targetGroupId: '123@g.us',
    participantIds: ['911111111111@s.whatsapp.net', '922222222222@s.whatsapp.net'],
    operationType: 'remove',
    totalOperations: 2,
    completedOperations: 0,
    failedOperations: 0,
    skippedOperations: 0,
    currentParticipantIndex: 0,
    currentRetryCount: 0,
    lastOperationTime: new Date(now.getTime() - 60000),
    nextOperationTime: new Date(now.getTime() - 1000), // due now
    operationDelayMs: 30000,
    errorLog: [],
    status: 'in-progress',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Mock the bridge: statusConnected controls GET /status, participantsStatus
 * controls POST /group-participants (200 = success).
 */
function mockBridge({ statusConnected = true, participantsStatus = 200 } = {}) {
  global.fetch = jest.fn(async (url: any) => {
    const u = String(url);
    if (u.includes('/status')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ connected: statusConnected, phone: { id: '919999999999' } }),
      } as any;
    }
    if (u.includes('/group-participants/')) {
      return {
        ok: participantsStatus === 200,
        status: participantsStatus,
        json: async () => (participantsStatus === 200 ? { success: true } : { error: 'nope' }),
      } as any;
    }
    if (u.includes('/group-info/')) {
      return { ok: true, status: 200, json: async () => ({ participants: [] }) } as any;
    }
    if (u.includes('/group-leave/')) {
      return { ok: true, status: 200, json: async () => ({ success: true }) } as any;
    }
    return { ok: false, status: 404, json: async () => ({}) } as any;
  }) as any;
}

beforeEach(() => {
  process.env.CRON_SECRET = CRON_SECRET;
  docs = [];
  jest.clearAllMocks();
});

describe('group-merge-processor-v2 cron', () => {
  it('pauses a job when the session is disconnected', async () => {
    docs = [makeJob()];
    mockBridge({ statusConnected: false });

    const res = await GET(makeReq());
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(docs[0].status).toBe('paused');
    expect(docs[0].currentParticipantIndex).toBe(0); // nobody skipped
    expect(docs[0].failedOperations).toBe(0);
  });

  it('auto-resumes a paused job once the session is healthy again', async () => {
    docs = [makeJob({ status: 'paused', lastError: 'Auto-signout detected - pausing to reconnect' })];
    mockBridge({ statusConnected: true, participantsStatus: 200 });

    await GET(makeReq());

    expect(docs[0].status).toBe('in-progress');
    expect(docs[0].lastError).toBeUndefined();
    // it also processed the due member in the same tick
    expect(docs[0].completedOperations).toBe(1);
    expect(docs[0].currentParticipantIndex).toBe(1);
  });

  it('retries the SAME member on a transient bridge error (no skip, no breaker count)', async () => {
    docs = [makeJob()];
    mockBridge({ statusConnected: true, participantsStatus: 503 });

    await GET(makeReq());

    expect(docs[0].currentParticipantIndex).toBe(0); // not skipped
    expect(docs[0].failedOperations).toBe(0); // not counted toward breaker
    expect(docs[0].currentRetryCount).toBe(1);
    expect(docs[0].status).toBe('in-progress');
    expect(docs[0].lastError).toContain('Temporary');
    // next attempt is pushed out by a normal gap
    expect(docs[0].nextOperationTime.getTime()).toBeGreaterThan(Date.now());
  });

  it('skips the member and counts a failure on a permanent (4xx) rejection', async () => {
    docs = [makeJob()];
    mockBridge({ statusConnected: true, participantsStatus: 400 });

    await GET(makeReq());

    expect(docs[0].currentParticipantIndex).toBe(1); // skipped
    expect(docs[0].failedOperations).toBe(1);
    expect(docs[0].currentRetryCount).toBe(0);
    expect(docs[0].errorLog).toHaveLength(1);
  });

  it('gives up on a member after exhausting transient retries', async () => {
    docs = [makeJob({ currentRetryCount: 3 })];
    mockBridge({ statusConnected: true, participantsStatus: 503 });

    await GET(makeReq());

    expect(docs[0].currentParticipantIndex).toBe(1); // finally skipped
    expect(docs[0].failedOperations).toBe(1);
    expect(docs[0].currentRetryCount).toBe(0); // reset for next member
  });

  it('marks the job in-progress after the first successful operation', async () => {
    docs = [makeJob({ status: 'pending' })];
    mockBridge({ statusConnected: true, participantsStatus: 200 });

    await GET(makeReq());

    expect(docs[0].status).toBe('in-progress');
    expect(docs[0].completedOperations).toBe(1);
  });

  it('retries the same member when the bridge is unreachable (network error)', async () => {
    docs = [makeJob()];
    global.fetch = jest.fn(async (url: any) => {
      if (String(url).includes('/status')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ connected: true, phone: { id: '919999999999' } }),
        } as any;
      }
      throw new Error('fetch failed');
    }) as any;

    await GET(makeReq());

    expect(docs[0].currentParticipantIndex).toBe(0);
    expect(docs[0].failedOperations).toBe(0);
    expect(docs[0].currentRetryCount).toBe(1);
  });
});
