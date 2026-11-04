/**
 * @jest-environment node
 */
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import { claimNextVideoIngestionJob, enqueueVideoSources, normalizeVideoSourceUrl, retryFailedVideoIngestionJob } from '@/lib/mohanRag/videoIngestionQueue';

jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyBatch: jest.fn().mockResolvedValue([]),
  bunnyExecute: jest.fn(),
}));

describe('Mohan RAG video ingestion queue', () => {
  beforeEach(() => jest.clearAllMocks());

  it('accepts Bunny CDN MP4 URLs and rejects non-Bunny hosts', () => {
    expect(normalizeVideoSourceUrl('https://swaryogacrm.b-cdn.net/lesson.mp4')).toEqual({
      url: 'https://swaryogacrm.b-cdn.net/lesson.mp4',
      provider: 'bunny',
    });
    expect(normalizeVideoSourceUrl('https://example.com/lesson.mp4')).toBeNull();
  });

  it('keeps Bunny Stream player URLs canonical until the worker resolves an available rendition', () => {
    expect(normalizeVideoSourceUrl(
      'https://iframe.mediadelivery.net/play/606386/107fce87-d999-4671-9d38-58ee2d3522b2'
    )).toEqual({
      url: 'https://iframe.mediadelivery.net/play/606386/107fce87-d999-4671-9d38-58ee2d3522b2',
      provider: 'bunny',
    });
  });

  it('retries only failed jobs', async () => {
    (bunnyExecute as jest.Mock).mockResolvedValueOnce({ rowsAffected: 1 });
    await expect(retryFailedVideoIngestionJob('job-1')).resolves.toBe(true);
    expect(bunnyExecute).toHaveBeenCalledWith(expect.objectContaining({
      sql: expect.stringContaining("WHERE id=? AND status='failed'"),
      args: [expect.any(String), 'job-1'],
    }));

    (bunnyExecute as jest.Mock).mockResolvedValueOnce({ rowsAffected: 0 });
    await expect(retryFailedVideoIngestionJob('job-2')).resolves.toBe(false);
  });

  it('reclaims a processing job left behind by a stopped worker', async () => {
    (bunnyExecute as jest.Mock).mockResolvedValueOnce({ rows: [] });
    await expect(claimNextVideoIngestionJob()).resolves.toBeNull();
    const [query] = (bunnyExecute as jest.Mock).mock.calls[0];
    expect(query.sql).toContain("status='processing' AND updated_at < ?");
    expect(query.args).toHaveLength(3);
    expect(query.args[1]).toMatch(/^\d{4}-\d\d-\d\dT/);
  });

  it('counts only newly inserted jobs and deduplicates URLs within a batch', async () => {
    (bunnyBatch as jest.Mock).mockResolvedValue([{ rowsAffected: 1 }]);
    (bunnyExecute as jest.Mock).mockResolvedValue({ rows: [] });
    const result = await enqueueVideoSources({
      urls: [
        'https://youtu.be/abcdefghijk',
        'https://www.youtube.com/watch?v=abcdefghijk',
      ],
      moduleId: 'general',
      topic: 'screening',
      language: 'auto',
      createdBy: 'admin',
    });

    expect(result.accepted).toBe(1);
    expect(result.duplicateCount).toBe(0);
    expect(bunnyBatch).toHaveBeenCalledWith([expect.objectContaining({
      args: expect.arrayContaining(['https://www.youtube.com/watch?v=abcdefghijk']),
    })]);
  });
});
