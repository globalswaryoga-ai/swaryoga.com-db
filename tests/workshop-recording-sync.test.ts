/** @jest-environment node */
import { syncZoomRecordingsForCohort } from '../lib/workshopRecordingSync';
import { getCohort, listRecordings, upsertRecording } from '../lib/workshopBunnyRepository';

jest.mock('../lib/workshopBunnyRepository', () => ({ getCohort: jest.fn(), listRecordings: jest.fn(), upsertRecording: jest.fn() }));
jest.mock('../lib/zoomAccessToken', () => ({ getZoomAccessToken: jest.fn().mockResolvedValue('test-token') }));

test('link-only recording sync persists Bunny metadata without deleting Zoom media', async () => {
  jest.mocked(getCohort).mockResolvedValue({ _id: 'c', startDate: '2026-10-12', holidayDates: [], zoomMeetingId: '123', timezone: 'Asia/Kolkata' });
  jest.mocked(listRecordings).mockResolvedValue([]);
  const meeting = { uuid: 'z', id: '123', recording_files: [{ recording_start: '2026-10-12T04:00:00Z', file_type: 'MP4', recording_type: 'speaker_view', play_url: 'https://zoom.us/play/test' }] };
  const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
    expect(init?.method).not.toBe('DELETE');
    const url = String(input);
    const payload = url.includes('instances') ? { meetings: [] } : url.includes('users/me') ? { meetings: [meeting] } : meeting;
    return new Response(JSON.stringify(payload), { status: 200 });
  });
  try {
    const result = await syncZoomRecordingsForCohort('c');
    expect(result.syncedDates).toEqual(['2026-10-12']);
    expect(upsertRecording).toHaveBeenCalledWith(expect.objectContaining({ dayNumber: 1, metadata: expect.objectContaining({ zoomSpeakerUrl: 'https://zoom.us/play/test' }) }));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  } finally {
    fetchMock.mockRestore();
  }
});
