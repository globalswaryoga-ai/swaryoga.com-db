import { GET } from '@/app/api/admin/crm/receipts/pdf/route';

jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(() => ({ isAdmin: true, userId: 'admin' })),
}));

jest.mock('@/lib/db', () => ({
  connectDB: jest.fn(async () => undefined),
}));

const findByIdMock = jest.fn();
const findOneMock = jest.fn();

jest.mock('@/lib/schemas/enterpriseSchemas', () => ({
  CrmReceipt: {
    findById: (...args: any[]) => findByIdMock(...args),
    findOne: (...args: any[]) => findOneMock(...args),
  },
}));

function makeReq(url: string) {
  return new Request(url, {
    method: 'GET',
    headers: {
      authorization: 'Bearer test',
    },
  }) as any;
}

describe('GET /api/admin/crm/receipts/pdf', () => {
  beforeEach(() => {
    findByIdMock.mockReset();
    findOneMock.mockReset();
  });

  it('returns 400 if missing id/leadId', async () => {
    const res = await GET(makeReq('http://localhost/api/admin/crm/receipts/pdf'));
    expect(res.status).toBe(400);
  });

  it('returns 404 if receipt not found', async () => {
    findByIdMock.mockReturnValue({ lean: () => null });

    const res = await GET(makeReq('http://localhost/api/admin/crm/receipts/pdf?id=507f1f77bcf86cd799439011'));
    expect(res.status).toBe(404);
  });

  it('returns a PDF when receipt is found by id', async () => {
    findByIdMock.mockReturnValue({
      lean: () => ({
        _id: '507f1f77bcf86cd799439011',
        receiptNumber: 'R-000001',
        issuedAt: new Date('2025-01-01T00:00:00.000Z'),
        customerName: 'Test User',
        customerPhone: '9999999999',
        customerEmail: 'test@example.com',
        workshopName: 'Swar Yoga Workshop',
        payment: { currency: 'INR', paidAmount: 1234, method: 'UPI', status: 'paid' },
      }),
    });

    const res = await GET(makeReq('http://localhost/api/admin/crm/receipts/pdf?id=507f1f77bcf86cd799439011'));
    if (res.status !== 200) {
      const err = await res.json().catch(() => null);
      // eslint-disable-next-line no-console
      console.log('pdf route error:', err);
    }
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');

    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(100);

    const head = Buffer.from(buf).subarray(0, 4).toString('utf8');
    expect(head).toBe('%PDF');
  });
});
