/** @jest-environment node */
jest.mock('@/lib/registrationAuth', () => ({ registrationViewer: jest.fn(() => ({ userId: 'admincrm', superAdmin: true })) }));
jest.mock('next/headers', () => ({ cookies: jest.fn(async () => ({ get: jest.fn() })) }));
jest.mock('@/lib/bunny-storage', () => ({ uploadToBunnyStorage: jest.fn() }));
import { POST } from '@/app/api/admin/canva/meta-ai/route';
import { registrationViewer } from '@/lib/registrationAuth';

describe('Legacy creative route guards', () => {
  const request = (body: object) => new Request('http://localhost/api/admin/canva/meta-ai', { method: 'POST', body: JSON.stringify(body) });
  it('rejects ignored reference images rather than charging for unrelated generation', async () => {
    const response = await POST(request({ prompt: 'create one image', messages: [{ role: 'user', imageUrl: '[Reference image attached]' }] }));
    expect(response.status).toBe(422);
    expect((await response.json()).error).toContain('cannot edit reference photos');
  });
  it('validates prompt type before provider calls', async () => {
    expect((await POST(request({ prompt: 123 }))).status).toBe(400);
  });
  it('requires an authenticated CRM admin', async () => {
    jest.mocked(registrationViewer).mockReturnValueOnce(null);
    expect((await POST(request({ prompt: 'create one image' }))).status).toBe(401);
  });
});
