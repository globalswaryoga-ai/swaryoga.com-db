import { POST } from '../app/api/admin/crm/whatsapp/conversations/delete/route';

jest.mock('../lib/auth', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('../lib/db', () => ({
  connectDB: jest.fn(),
}));

jest.mock('../lib/schemas/enterpriseSchemas', () => ({
  WhatsAppMessage: {
    deleteMany: jest.fn(),
  },
}));

const { verifyToken } = jest.requireMock('../lib/auth') as { verifyToken: jest.Mock };
const { connectDB } = jest.requireMock('../lib/db') as { connectDB: jest.Mock };
const { WhatsAppMessage } = jest.requireMock('../lib/schemas/enterpriseSchemas') as {
  WhatsAppMessage: { deleteMany: jest.Mock };
};

describe('POST /api/admin/crm/whatsapp/conversations/delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 if not admin', async () => {
    verifyToken.mockReturnValue({ userId: 'x', isAdmin: false });

    const req = new Request('http://localhost/api/admin/crm/whatsapp/conversations/delete', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadIds: ['507f1f77bcf86cd799439011'] }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('returns 400 if missing identifiers', async () => {
    verifyToken.mockReturnValue({ userId: 'admin', isAdmin: true });

    const req = new Request('http://localhost/api/admin/crm/whatsapp/conversations/delete', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('deletes by leadIds and returns deletedCount', async () => {
    verifyToken.mockReturnValue({ userId: 'admin', isAdmin: true });
    connectDB.mockResolvedValue(undefined);
    WhatsAppMessage.deleteMany.mockResolvedValue({ deletedCount: 3 });

    const req = new Request('http://localhost/api/admin/crm/whatsapp/conversations/delete', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadIds: ['507f1f77bcf86cd799439011'] }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ success: true, data: { deletedCount: 3 } });
    expect(WhatsAppMessage.deleteMany).toHaveBeenCalledTimes(1);
  });
});
