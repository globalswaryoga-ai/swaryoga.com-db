/** @jest-environment node */

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status || 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyExecute: jest.fn(),
}));

import { bunnyExecute } from '@/lib/bunnyDatabase';
import { POST as postExtractionJobs } from '@/app/api/avatar/extraction-jobs/route';
import { POST as postMasterIdentity } from '@/app/api/avatar/master-identity/route';
import {
  initMasterIdentityDatabase,
  validateVideoIdentityConsistency,
} from '@/lib/avatarStudio/masterIdentityEngine';
import { swarNeuralAdapter } from '@/lib/avatarExtraction/providers/swarNeuralAdapter';

describe('Mohan master identity reference-only state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores DNA metadata as unanalyzed references and clears certification metrics', async () => {
    jest.mocked(bunnyExecute).mockImplementation(async (statement: any) => {
      if (typeof statement === 'string') return { rows: [] } as any;
      if (statement.sql.includes('SELECT id, title, video_url')) {
        return {
          rows: [{ id: 'dna-1', title: 'Reference clip', video_url: 'private-reference-url' }],
        } as any;
      }
      if (statement.sql.includes('FROM mohan_rag_sources_sql')) {
        return {
          rows: [
            { source_type: 'youtube', count: 76 },
            { source_type: 'bunny_stream', count: 39 },
            { source_type: 'mp4', count: 7 },
          ],
        } as any;
      }
      return { rowsAffected: 1 } as any;
    });

    await initMasterIdentityDatabase();

    const insert = jest.mocked(bunnyExecute).mock.calls
      .map(([statement]) => statement)
      .find((statement: any) => typeof statement !== 'string' &&
        statement.sql.includes('INSERT INTO mohan_master_identity_sql')) as any;

    expect(insert).toBeDefined();
    expect(insert.sql).toContain('identity_quality_score = NULL');
    expect(insert.args[8]).toBeNull();
    expect(insert.args[10]).toBe('REFERENCE_ONLY');
    expect(JSON.parse(insert.args[5])).toEqual([]);
    expect(JSON.parse(insert.args[6])).toEqual([]);
    expect(JSON.parse(insert.args[3])).toMatchObject({
      status: 'METADATA_ONLY_NOT_ANALYZED',
      source_video_count: {
        catalogued_media_count: 122,
        catalog_type_counts: { youtube: 76, bunny_stream: 39, mp4: 7 },
        catalog_snapshot_verified: true,
        analyzed: 0,
      },
      dna_video_references: { loaded_metadata_count: 1, analyzed: 0 },
    });
    expect(JSON.parse(insert.args[4]).status).toBe('NOT_GENERATED');
    expect(JSON.parse(insert.args[9])).toMatchObject({
      status: 'NOT_RUN',
      overall_identity_fidelity: null,
    });
  });

  it('does not report URL-based identity verification', async () => {
    await expect(validateVideoIdentityConsistency('https://swaryogacrm.b-cdn.net/clip.mp4'))
      .resolves.toMatchObject({
        available: false,
        passed: false,
        score: null,
        sampledTimestamps: [],
      });
  });

  it('keeps the built-in facial provider unavailable instead of returning fabricated metrics', () => {
    expect(swarNeuralAdapter.isConfigured()).toBe(false);
    expect(swarNeuralAdapter.validateSourceVideo({ height: 1080 })).toMatchObject({
      valid: false,
      qualityScore: null,
      resolutionLabel: 'Not analyzed',
    });
    expect(() => swarNeuralAdapter.extractBiometrics('Mohan Sir'))
      .toThrow('no inference pipeline is configured');
  });

  it('returns HTTP 503 when identity inference is unavailable', async () => {
    const response = await postMasterIdentity({
      json: async () => ({
        action: 'validate_consistency',
        video_url: 'https://swaryogacrm.b-cdn.net/clip.mp4',
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      success: false,
      validation: { available: false, passed: false, score: null },
    });
  });

  it('does not queue extraction jobs for the unavailable in-house provider', async () => {
    const response = await postExtractionJobs({
      json: async () => ({
        action: 'create',
        sourceVideoId: 'source-1',
        avatarName: 'Mohan Sir',
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ success: false });
    expect(bunnyExecute).not.toHaveBeenCalled();
  });
});
