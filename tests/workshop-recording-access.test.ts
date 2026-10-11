/** @jest-environment node */
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyExecute: jest.fn() }));
jest.mock('@/lib/workshopBunnyRepository', () => ({
  getCohort: jest.fn(), listAttendance: jest.fn(), listCohorts: jest.fn(),
  listRecordings: jest.fn(), listStudents: jest.fn(),
}));
jest.mock('@/lib/bunnyLeadsRepository', () => ({ getBunnyLeadById: jest.fn() }));
jest.mock('@/lib/registrationAutomation', () => ({ queueRegistrationTemplate: jest.fn(), resolveRegistrationTemplate: jest.fn() }));
jest.mock('@/lib/whatsapp', () => ({ normalizePhone: (value: string) => String(value || '').replace(/\D/g, '') }));

import { createClient, Client } from '@libsql/client';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { getCohort, listAttendance, listCohorts, listRecordings, listStudents } from '@/lib/workshopBunnyRepository';
import { getBunnyLeadById } from '@/lib/bunnyLeadsRepository';
import { queueRegistrationTemplate, resolveRegistrationTemplate } from '@/lib/registrationAutomation';
import { handleWorkshopRecordingRequest, queueWorkshopRecording, recordingEligibility } from '@/lib/workshopRecordingAccess';
import { recordingAccessPolicy } from '@/lib/workshopRecordingPolicy';
import { chatbotTriggerValues } from '@/lib/chatbotTriggerValues';

describe('Workshop shared recording allowance', () => {
  let client: Client;
  const cohort = { _id: 'cohort', name: 'Class', createdByUserId: 'admincrm', startDate: '2026-10-01', timezone: 'Asia/Kolkata',
    holidayDates: [], metadata: { recordingAccess: { enabled: true, maxDays: 3, minimumMinutes: 60, keywords: ['recording'], templateId: 'template' } } };
  beforeEach(() => {
    jest.clearAllMocks();
    client = createClient({ url: 'file::memory:' });
    jest.mocked(bunnyExecute).mockImplementation(statement => client.execute(statement));
    jest.mocked(getCohort).mockResolvedValue(cohort);
    jest.mocked(listCohorts).mockResolvedValue([cohort]);
    jest.mocked(listStudents).mockResolvedValue([{ _id: 'student', leadId: 'lead', phone: '919876543210', name: 'Student' }]);
    jest.mocked(listAttendance).mockResolvedValue(Array.from({ length: 8 }, (_, i) => ({
      _id: `a${i}`, studentId: 'student', classDate: `2026-10-0${i + 1}`, joined: false, durationSeconds: 0,
    })));
    jest.mocked(listRecordings).mockResolvedValue(Array.from({ length: 8 }, (_, i) => ({
      _id: `r${i}`, classDate: `2026-10-0${i + 1}`, youtubeSpeakerUrl: `https://youtu.be/session${i}`,
    })));
    jest.mocked(getBunnyLeadById).mockResolvedValue({ _id: 'lead', phoneNumber: '919876543210' });
    jest.mocked(resolveRegistrationTemplate).mockResolvedValue({ _id: 'template', templateName: 'recording', templateContent: 'Links: {{1}}' });
    jest.mocked(queueRegistrationTemplate).mockImplementation(async input => ({ runId: input.eventKey, queued: 1 }));
  });
  afterEach(() => client.close());

  it('never assumes missing attendance is absence and uses the exact completion threshold', () => {
    expect(recordingEligibility(undefined, 60).eligible).toBe(false);
    expect(recordingEligibility({ joined: true, durationSeconds: 3599 }, 60).eligible).toBe(true);
    expect(recordingEligibility({ joined: true, durationSeconds: 3600 }, 60).eligible).toBe(false);
    expect(recordingEligibility({ joined: true, durationSeconds: NaN }, 60).eligible).toBe(false);
  });
  it.each([3, 4, 5])('supports an editable %i-day allowance and rejects invalid limits', maxDays => {
    expect(recordingAccessPolicy({ maxDays }).maxDays).toBe(maxDays);
    expect(() => recordingAccessPolicy({ maxDays: 6 })).toThrow();
  });
  it('shares distinct days between requests and automatic attendance delivery', async () => {
    for (const [classDate, source] of [['2026-10-01', 'request'], ['2026-10-02', 'attendance'], ['2026-10-03', 'request']] as const) {
      expect((await queueWorkshopRecording({ cohortId: 'cohort', studentId: 'student', classDate, source })).queued).toBe(true);
    }
    const repeat = await queueWorkshopRecording({ cohortId: 'cohort', studentId: 'student', classDate: '2026-10-01', source: 'attendance' });
    expect(repeat.queued).toBe(false);
    const fourth = await queueWorkshopRecording({ cohortId: 'cohort', studentId: 'student', classDate: '2026-10-04', source: 'request' });
    expect(fourth.queued).toBe(false);
    expect(queueRegistrationTemplate).toHaveBeenCalledTimes(3);
  });
  it('ten parallel same-session requests queue one deterministic event and consume one day', async () => {
    await Promise.all(Array.from({ length: 10 }, () => queueWorkshopRecording({ cohortId: 'cohort', studentId: 'student', classDate: '2026-10-01', source: 'request' })));
    expect((await client.execute('SELECT * FROM workshop_recording_access_sql')).rows).toHaveLength(1);
    expect(new Set(jest.mocked(queueRegistrationTemplate).mock.calls.map(([input]) => input.eventKey)).size).toBe(1);
  });
  it('concurrent distinct-session requests cannot exceed the shared allowance', async () => {
    await Promise.all(['01', '02', '03', '04', '06', '07', '08'].map(day =>
      queueWorkshopRecording({ cohortId: 'cohort', studentId: 'student', classDate: `2026-10-${day}`, source: 'request' })));
    expect((await client.execute('SELECT * FROM workshop_recording_access_sql')).rows).toHaveLength(3);
  });
  it('does not consume an allowance in preview or when the recording is unavailable', async () => {
    await queueWorkshopRecording({ cohortId: 'cohort', studentId: 'student', classDate: '2026-10-01', source: 'request', dryRun: true });
    expect((await client.execute('SELECT * FROM workshop_recording_access_sql')).rows).toHaveLength(0);
    jest.mocked(listRecordings).mockResolvedValue([]);
    expect((await queueWorkshopRecording({ cohortId: 'cohort', studentId: 'student', classDate: '2026-10-02', source: 'request' })).queued).toBe(false);
    expect(queueRegistrationTemplate).not.toHaveBeenCalled();
  });
  it('rejects completed attendance and never sends a holiday recording', async () => {
    jest.mocked(listAttendance).mockResolvedValue([{ _id: 'a', studentId: 'student', classDate: '2026-10-01', joined: true, durationSeconds: 3600 }]);
    expect((await queueWorkshopRecording({ cohortId: 'cohort', studentId: 'student', classDate: '2026-10-01', source: 'request' })).queued).toBe(false);
    jest.mocked(getCohort).mockResolvedValue({ ...cohort, holidayDates: ['2026-10-02'] });
    expect((await queueWorkshopRecording({ cohortId: 'cohort', studentId: 'student', classDate: '2026-10-02', source: 'request' })).queued).toBe(false);
  });
  it('carries Meta button payloads and list IDs, not only visible titles', () => {
    expect(chatbotTriggerValues({ button: { payload: 'recording', text: 'Get class' } })).toEqual(['recording', 'Get class']);
    expect(chatbotTriggerValues({ interactive: { list_reply: { id: 'recording', title: 'Class video' } } })).toEqual(['recording', 'Class video']);
  });
  it('keyword button request uses the same allowance and keeps yesterday literal', async () => {
    const input = { leadId: 'lead', phoneNumber: '919876543210', messageBody: 'yesterday', triggerValues: ['recording'], tenantUserId: 'admincrm', now: new Date('2026-10-03T06:00:00Z') };
    expect((await handleWorkshopRecordingRequest(input)).handled).toBe(true);
    expect(queueRegistrationTemplate).toHaveBeenCalledWith(expect.objectContaining({ eventKey: 'workshop-recording:cohort:student:2026-10-02' }));
  });
});
