/** @jest-environment node */
jest.mock('@/lib/bunnyCrmSettings', () => ({ getBunnyCrmUserSettings: jest.fn() }));
jest.mock('@/lib/bunnyLeadsRepository', () => ({ loadBunnyLeads: jest.fn() }));
jest.mock('@/lib/workshopBunnyRepository', () => ({
  getCohort: jest.fn(), listStudents: jest.fn(), updateCohort: jest.fn(), insertWorkshopGroupStudents: jest.fn(), updateWorkshopGroupStudents: jest.fn(),
}));
import { getBunnyCrmUserSettings } from '@/lib/bunnyCrmSettings';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { getCohort, listStudents, updateCohort, insertWorkshopGroupStudents, updateWorkshopGroupStudents } from '@/lib/workshopBunnyRepository';
import { syncWorkshopWhatsappStudents, workshopParticipantPhone } from '@/lib/workshopWhatsappStudents';

describe('Workshop WhatsApp student sync', () => {
  const viewer = { userId: 'owner', superAdmin: false };
  const cohort = { _id: 'cohort', createdByUserId: 'owner', whatsappGroupLink: 'https://chat.whatsapp.com/Code123', metadata: {} };
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getCohort).mockResolvedValue(cohort);
    jest.mocked(listStudents).mockResolvedValue([]);
    jest.mocked(loadBunnyLeads).mockResolvedValue([]);
    jest.mocked(updateCohort).mockResolvedValue(cohort);
    jest.mocked(updateWorkshopGroupStudents).mockResolvedValue(undefined);
  });
  it('prefers resolved phones and never treats unresolved LIDs as numbers', () => {
    expect(workshopParticipantPhone({ id: '12345678901234@lid', resolvedPhone: '+91 9876543210' })).toBe('919876543210');
    expect(workshopParticipantPhone({ id: '12345678901234@lid' })).toBe('');
  });
  it('fills name/email/place from scoped CRM leads and deduplicates aliases', async () => {
    jest.mocked(loadBunnyLeads).mockResolvedValue([
      { _id: 'other', phoneNumber: '9876543210', name: 'Foreign', createdByUserId: 'other' },
      { _id: 'lead', phoneNumber: '9876543210', name: 'Student', email: 'student@example.com', leadNumber: '123', metadata: { city: 'Pune', state: 'Maharashtra', country: 'India' }, createdByUserId: 'owner' },
    ]);
    const result = await syncWorkshopWhatsappStudents('cohort', viewer, [
      { id: '11111111111111@lid', resolvedPhone: '919876543210' },
      { id: '919876543210@s.whatsapp.net' }, { id: '22222222222222@lid' },
    ]);
    expect(result).toMatchObject({ imported: 1, matchedLeads: 1, unresolved: 1 });
    expect(insertWorkshopGroupStudents).toHaveBeenCalledWith([expect.objectContaining({
      name: 'Student', email: 'student@example.com', leadId: 'lead', whatsappJid: '919876543210@s.whatsapp.net',
      metadata: { city: 'Pune', state: 'Maharashtra', country: 'India' },
    })]);
  });
  it('preserves manually removed students and existing populated details', async () => {
    jest.mocked(listStudents).mockResolvedValue([
      { _id: 'removed', phone: '919876543210', active: false },
      { _id: 'existing', phone: '919876543211', name: 'Manual Name', email: 'manual@example.com', active: true, metadata: { city: 'Mumbai', note: 'Keep' }, updated_at: 'version' },
    ]);
    jest.mocked(loadBunnyLeads).mockResolvedValue([{ _id: 'lead', phoneNumber: '919876543211', name: 'CRM Name', email: 'crm@example.com', city: 'Pune', country: 'India', createdByUserId: 'owner' }]);
    const result = await syncWorkshopWhatsappStudents('cohort', viewer, [{ phone: '9876543210' }, { phone: '9876543211' }]);
    expect(result.preservedRemoved).toBe(1);
    expect(insertWorkshopGroupStudents).toHaveBeenCalledWith([]);
    expect(updateWorkshopGroupStudents).toHaveBeenCalledWith([expect.objectContaining({
      name: 'Manual Name', email: 'manual@example.com', metadata: { city: 'Mumbai', note: 'Keep', country: 'India' },
      _id: 'existing', cohortId: 'cohort', expectedUpdatedAt: 'version',
    })]);
  });
  it('rejects another owner workshop before contacting WhatsApp', async () => {
    await expect(syncWorkshopWhatsappStudents('cohort', { userId: 'other', superAdmin: false }, [])).rejects.toThrow('another admin');
    expect(loadBunnyLeads).not.toHaveBeenCalled();
  });
  it('rejects stale student writes without replacing newer details', async () => {
    jest.mocked(listStudents).mockResolvedValue([{ _id: 'student', phone: '919876543210', name: '919876543210', active: true, updated_at: 'old' }]);
    jest.mocked(loadBunnyLeads).mockResolvedValue([{ _id: 'lead', phoneNumber: '919876543210', name: 'CRM Name', createdByUserId: 'owner' }]);
    jest.mocked(updateWorkshopGroupStudents).mockRejectedValue(new Error('A student was edited during group sync. Retry; the newer details were preserved.'));
    await expect(syncWorkshopWhatsappStudents('cohort', viewer, [{ phone: '9876543210' }])).rejects.toThrow('newer details were preserved');
  });
  it('resolves the exact saved link using supported bridge endpoints and caches it', async () => {
    jest.mocked(getBunnyCrmUserSettings).mockResolvedValue({ userId: 'owner', permanentTenantId: '0002460' });
    const original = global.fetch;
    const fetchMock = jest.fn().mockImplementation(async url => ({
      ok: true, text: async () => JSON.stringify(String(url).endsWith('/chats')
        ? { chats: [{ id: '123@g.us' }] } : String(url).includes('/group-invite/')
        ? { code: 'Code123' } : { participants: [{ resolvedPhone: '919876543210' }] }),
    }));
    global.fetch = fetchMock;
    try {
      await syncWorkshopWhatsappStudents('cohort', viewer);
      expect(fetchMock.mock.calls.map(([url]) => String(url).split('/').pop())).toEqual(['chats', '123%40g.us', '123%40g.us']);
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/group-info/'), expect.objectContaining({
        headers: expect.objectContaining({ 'x-user-id': 'owner', 'x-session-key': '0002460' }),
      }));
      expect(updateCohort).toHaveBeenCalledWith('cohort', { metadata: { whatsappStudentGroup: { link: cohort.whatsappGroupLink, id: '123@g.us' } } }, { metadata: {} });
    } finally { global.fetch = original; }
  });
});
