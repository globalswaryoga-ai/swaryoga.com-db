/**
 * @jest-environment node
 */
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import {
  getAvatarDnaVideoKey,
  getDuplicateAvatarDnaLookIds,
  saveAvatarDnaLook,
} from '@/lib/mohanRag/avatarDnaRepository';

jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyBatch: jest.fn().mockResolvedValue([]),
  bunnyExecute: jest.fn(),
}));

describe('Mohan RAG Avatar DNA video deduplication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recognizes the same Bunny video across player and CDN URLs', () => {
    expect(getAvatarDnaVideoKey('https://iframe.mediadelivery.net/play/606386/107fce87-d999-4671-9d38-58ee2d3522b2'))
      .toBe(getAvatarDnaVideoKey('https://vz-d0769ece-079.b-cdn.net/107fce87-d999-4671-9d38-58ee2d3522b2/play_720p.mp4'));
  });

  it('recognizes YouTube links regardless of watch or short-link format', () => {
    expect(getAvatarDnaVideoKey('https://www.youtube.com/watch?v=abc123&utm_source=test'))
      .toBe(getAvatarDnaVideoKey('https://youtu.be/abc123'));
  });

  it('keeps the active record and returns other duplicate IDs for cleanup', () => {
    const duplicates = getDuplicateAvatarDnaLookIds([
      { id: 'old', video_url: 'https://iframe.mediadelivery.net/play/606386/107fce87-d999-4671-9d38-58ee2d3522b2' },
      { id: 'active', video_url: 'https://vz-d0769ece-079.b-cdn.net/107fce87-d999-4671-9d38-58ee2d3522b2/play_720p.mp4' },
      { id: 'other', video_url: 'https://iframe.mediadelivery.net/play/606386/d06767ad-3ba3-4695-b3e5-32e3012fdbc2' },
    ], 'active');

    expect(duplicates).toEqual(['old']);
  });

  it('updates the existing DNA look instead of inserting the same video again', async () => {
    const rows: Array<Record<string, unknown>> = [];
    (bunnyBatch as jest.Mock).mockResolvedValue([]);
    (bunnyExecute as jest.Mock).mockImplementation(async (statement: string | { sql: string; args?: unknown[] }) => {
      const sql = typeof statement === 'string' ? statement : statement.sql;
      const args = typeof statement === 'string' ? [] : statement.args || [];

      if (sql.includes('COUNT(*) as cnt FROM mohan_avatar_dna_looks_sql')) {
        return { rows: [{ cnt: 1 }] };
      }
      if (sql.includes('SELECT active_look_id FROM mohan_active_avatar_dna_sql')) {
        return { rows: [] };
      }
      if (sql.includes('SELECT id, video_url, is_active, created_at FROM mohan_avatar_dna_looks_sql')) {
        return { rows };
      }
      if (sql.includes('SELECT * FROM mohan_avatar_dna_looks_sql')) {
        return { rows };
      }
      if (sql.includes('INSERT OR REPLACE INTO mohan_avatar_dna_looks_sql')) {
        const [id, title, heading, description, video_url] = args;
        const existingIndex = rows.findIndex((row) => row.id === id);
        const row = { id, title, heading, description, video_url, is_active: 0, created_at: args[13] };
        if (existingIndex < 0) rows.push(row);
        else rows[existingIndex] = row;
        return { rows: [], rowsAffected: 1 };
      }
      return { rows: [], rowsAffected: 0 };
    });

    const first = await saveAvatarDnaLook({
      title: 'First title',
      video_url: 'https://iframe.mediadelivery.net/play/606386/107fce87-d999-4671-9d38-58ee2d3522b2',
    });
    const second = await saveAvatarDnaLook({
      id: 'alternate-crown-id',
      title: 'Updated title',
      video_url: 'https://vz-d0769ece-079.b-cdn.net/107fce87-d999-4671-9d38-58ee2d3522b2/play_720p.mp4',
    });

    expect(second.id).toBe(first.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Updated title');
  });
});
