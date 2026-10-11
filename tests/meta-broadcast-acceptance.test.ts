/** @jest-environment node */
jest.mock('@/lib/whatsapp', () => ({ buildCloudTemplateSendInput: jest.fn(), sendWhatsAppTemplate: jest.fn() }));
jest.mock('@/lib/whatsappAccounts', () => ({ getMetaCredentialsForTenant: jest.fn() }));
jest.mock('@/lib/bunnyMetaWhatsAppRepository', () => ({ upsertBunnyMetaMessage: jest.fn() }));
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyExecute: jest.fn() }));
jest.mock('@/lib/workshopBunnyRepository', () => ({ getCohort: jest.fn(), listStudents: jest.fn(), listAttendance: jest.fn() }));
jest.mock('@/lib/workshopRecordingAccess', () => ({
  recordingAccessPolicy: (policy: unknown) => policy,
  recordingEligibility: (attendance: { durationSeconds: number }) => ({ eligible: attendance?.durationSeconds < 3600 }),
}));
jest.mock('@/lib/bunnyBroadcastRepository', () => ({
  broadcastRunFind: jest.fn(), broadcastRunFindOne: jest.fn(), broadcastRunMessageFind: jest.fn(),
  broadcastRunMessageUpdateOne: jest.fn(), broadcastRunUpdateOne: jest.fn(),
  getTemplateById: jest.fn(), markRunStatsBunny: jest.fn(),
}));

import { processDueBunnyMetaBroadcasts } from '@/lib/bunnyMetaBroadcastProcessor';
import { sendWhatsAppTemplate, buildCloudTemplateSendInput } from '@/lib/whatsapp';
import { getCohort, listAttendance, listStudents } from '@/lib/workshopBunnyRepository';
import { getMetaCredentialsForTenant } from '@/lib/whatsappAccounts';
import { upsertBunnyMetaMessage } from '@/lib/bunnyMetaWhatsAppRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import {
  broadcastRunFindOne, broadcastRunMessageFind, broadcastRunMessageUpdateOne,
  broadcastRunUpdateOne, getTemplateById, markRunStatsBunny,
} from '@/lib/bunnyBroadcastRepository';

describe('Meta provider acceptance and safe report actions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(broadcastRunFindOne).mockResolvedValue({ _id: 'test-run', status: 'scheduled', templateId: 'template', createdByUserId: 'admincrm' });
    jest.mocked(getTemplateById).mockResolvedValue({ templateName: 'workshop', status: 'approved' });
    jest.mocked(broadcastRunMessageFind).mockResolvedValue([{ _id: 'recipient', phoneNumber: '919000000000' }]);
    jest.mocked(broadcastRunMessageUpdateOne).mockResolvedValue(true);
    jest.mocked(getMetaCredentialsForTenant).mockResolvedValue(null);
    jest.mocked(bunnyExecute).mockResolvedValue({ rows: [], rowsAffected: 0, columns: [], columnTypes: [], lastInsertRowid: undefined, toJSON: () => ({}) });
    jest.mocked(sendWhatsAppTemplate).mockResolvedValue({ waMessageId: 'wamid.accepted', raw: {} });
    jest.mocked(markRunStatsBunny).mockResolvedValue({ total: 1, pending: 0, sent: 1, failed: 0, delivered: 0, read: 0 });
  });
  it.each([
    { status: 'cancelled' },
    { status: 'scheduled', reportFolder: 'deleted' },
    { status: 'scheduled', scheduledAt: '2099-01-01T00:00:00Z' },
  ])('does not send after cancellation, archival or a future reschedule: %j', async patch => {
    jest.mocked(broadcastRunFindOne).mockResolvedValue({ _id: 'test-run', templateId: 'template', ...patch });
    const result = await processDueBunnyMetaBroadcasts({ runId: 'test-run' });
    expect(result.attempted).toBe(0);
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled();
    expect(broadcastRunUpdateOne).not.toHaveBeenCalled();
  });
  it('preserves accepted provider evidence when inbox history persistence fails', async () => {
    jest.mocked(upsertBunnyMetaMessage).mockRejectedValue(new Error('Inbox unavailable'));
    const result = await processDueBunnyMetaBroadcasts({ runId: 'test-run' });
    expect(result).toMatchObject({ attempted: 1, sent: 1, failed: 0 });
    expect(broadcastRunMessageUpdateOne).toHaveBeenCalledWith('recipient', expect.objectContaining({ status: 'sent', waMessageId: 'wamid.accepted' }));
    expect(jest.mocked(broadcastRunMessageUpdateOne).mock.calls.some(([, patch]) => patch.status === 'failed')).toBe(false);
    expect(result.runResults[0]).toMatchObject({ status: 'error', error: 'Inbox unavailable' });
  });
  it('does not send when another action has prevented the recipient claim', async () => {
    jest.mocked(broadcastRunMessageUpdateOne).mockResolvedValue(false);
    const result = await processDueBunnyMetaBroadcasts({ runId: 'test-run' });
    expect(result.attempted).toBe(0);
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled();
  });
  it('sends actual recording URLs from the saved snapshot, not the variable name or stale template defaults', async () => {
    jest.mocked(broadcastRunFindOne).mockResolvedValue({ _id: 'registration_recording', status: 'scheduled', templateId: 'template', createdByUserId: 'admincrm',
      templateSnapshot: { recordingAccess: { cohortId: 'cohort', studentId: 'student', classDate: '2026-10-01' },
        variables: { '1': 'https://youtu.be/class-speaker\nhttps://youtu.be/class-gallery' } } });
    jest.mocked(getCohort).mockResolvedValue({ _id: 'cohort', createdByUserId: 'admincrm', metadata: {
      recordingAccess: { enabled: true, templateId: 'template', minimumMinutes: 60 } } });
    jest.mocked(listStudents).mockResolvedValue([{ _id: 'student' }]);
    jest.mocked(listAttendance).mockResolvedValue([{ _id: 'a', studentId: 'student', classDate: '2026-10-01', joined: false, durationSeconds: 0 }]);
    jest.mocked(buildCloudTemplateSendInput).mockReturnValue({ to: '919000000000', templateName: 'workshop', language: 'en', bodyParams: ['1'] });
    await processDueBunnyMetaBroadcasts({ runId: 'registration_recording' });
    expect(sendWhatsAppTemplate).toHaveBeenCalledWith(expect.objectContaining({
      bodyParams: ['https://youtu.be/class-speaker\nhttps://youtu.be/class-gallery'],
    }), undefined);
  });
});
