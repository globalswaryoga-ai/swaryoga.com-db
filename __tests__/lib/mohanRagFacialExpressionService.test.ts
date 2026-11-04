/**
 * @jest-environment node
 */
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import {
  getFacialClipsForVideo,
  getFacialExtractionDashboard,
} from '@/lib/mohanRag/facialExpressionService';

jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyBatch: jest.fn().mockResolvedValue([]),
  bunnyExecute: jest.fn(),
}));

describe('Mohan RAG facial extraction dashboard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns review clips and bounded summary data without modifying extraction records', async () => {
    (bunnyExecute as jest.Mock)
      .mockResolvedValueOnce({
        rows: [{
          id: 'clip-1',
          job_id: 'job-1',
          video_url: 'https://www.youtube.com/watch?v=abcdefghijk',
          timestamp_ms: 12_000,
          timestamp_formatted: '00:12',
          primary_expression: 'smile_warm',
          intensity: 80,
          confidence: 0.9,
          created_at: '2026-11-03T08:00:00.000Z',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ clip_count: 37_158, video_count: 49 }] })
      .mockResolvedValueOnce({ rows: [{ orphaned_clip_count: 37_158 }] })
      .mockResolvedValueOnce({ rows: [{ primary_expression: 'smile_warm', count: 100 }] });

    const result = await getFacialExtractionDashboard(500, -10);

    expect(result).toMatchObject({
      totalClips: 37_158,
      videoCount: 49,
      orphanedClipCount: 37_158,
      expressionCounts: [{ expression: 'smile_warm', count: 100 }],
    });
    expect(result.clips).toHaveLength(1);
    const clipQuery = (bunnyExecute as jest.Mock).mock.calls.find(([query]) =>
      typeof query !== 'string' && query.sql.includes('ORDER BY created_at DESC, id DESC')
    )?.[0];
    expect(clipQuery.args).toEqual([100, 0]);
    expect(clipQuery.sql).toContain("blendshapes_json != '{}'");
    expect((bunnyExecute as jest.Mock).mock.calls.some(([query]) => {
      const sql = typeof query === 'string' ? query : query.sql;
      return sql.includes('COUNT(*) AS clip_count') && sql.includes("blendshapes_json != '{}'");
    })).toBe(true);
    expect(bunnyBatch).toHaveBeenCalledTimes(1);
    expect((bunnyBatch as jest.Mock).mock.calls[0][0].every((statement: { sql: string }) =>
      statement.sql.startsWith('CREATE TABLE') || statement.sql.startsWith('CREATE INDEX')
    )).toBe(true);
  });

  it('returns only face-detected clips with parsed blendshapes for transcript alignment', async () => {
    (bunnyExecute as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          timestamp_ms: 12_000,
          blendshapes_json: '{"mouthSmileLeft":0.8}',
        },
        {
          timestamp_ms: 14_000,
          blendshapes_json: '{}',
        },
      ],
    });

    const clips = await getFacialClipsForVideo('https://example.test/video.mp4');

    expect(clips).toHaveLength(1);
    expect(clips[0]).toMatchObject({
      timestamp_sec: 12,
      face_detected: true,
      blendshapes: { mouthSmileLeft: 0.8 },
    });
    expect((bunnyExecute as jest.Mock).mock.calls[0][0].sql).toContain("blendshapes_json != '{}'");
  });
});
