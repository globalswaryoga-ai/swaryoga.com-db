/** @jest-environment node */
jest.mock('@/lib/workshopBunnyRepository', () => ({ listCohorts: jest.fn(), getCohort: jest.fn(), updateCohort: jest.fn() }));
jest.mock('@/lib/workshopWhatsappStudents', () => ({ syncWorkshopWhatsappStudents: jest.fn() }));
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/workshop-whatsapp-students/route';
import { listCohorts, getCohort, updateCohort } from '@/lib/workshopBunnyRepository';
import { syncWorkshopWhatsappStudents } from '@/lib/workshopWhatsappStudents';

describe('Workshop group student cron', () => {
  const secret = process.env.CRON_SECRET;
  afterAll(() => { if (secret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = secret; });
  beforeEach(() => { jest.clearAllMocks(); process.env.CRON_SECRET = 'test-secret'; });
  it('rejects unauthorized cron calls', async () => {
    expect((await GET(new NextRequest('https://example.com/api/cron/workshop-whatsapp-students'))).status).toBe(401);
    expect(listCohorts).not.toHaveBeenCalled();
  });
  it('processes only enabled linked workshops and saves errors without disabling them', async () => {
    const cohort = { _id: 'enabled', createdByUserId: 'owner', autoSyncWhatsappGroup: true, whatsappGroupLink: 'saved-link', metadata: { note: 'keep' } };
    jest.mocked(listCohorts).mockResolvedValue([cohort, { ...cohort, _id: 'off', autoSyncWhatsappGroup: false }]);
    jest.mocked(getCohort).mockResolvedValue(cohort);
    jest.mocked(updateCohort).mockResolvedValue(cohort);
    jest.mocked(syncWorkshopWhatsappStudents).mockRejectedValue(new Error('QR disconnected'));
    const response = await GET(new NextRequest('https://example.com/api/cron/workshop-whatsapp-students', { headers: { Authorization: 'Bearer test-secret' } }));
    expect(response.status).toBe(207);
    expect(syncWorkshopWhatsappStudents).toHaveBeenCalledTimes(1);
    expect(updateCohort).toHaveBeenCalledWith('enabled', { metadata: expect.objectContaining({ note: 'keep', whatsappStudentSyncError: 'QR disconnected' }) }, { metadata: { note: 'keep' } });
  });
});
