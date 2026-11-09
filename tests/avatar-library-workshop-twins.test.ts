/** @jest-environment node */

process.env.JWT_SECRET = 'test_jwt_secret_key_12345';

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

jest.mock('@/lib/avatarStudio/avatarStudioDb', () => ({
  initAvatarStudioDb: jest.fn().mockResolvedValue(undefined),
}));

import { bunnyExecute } from '@/lib/bunnyDatabase';
import { POST as postAvatarLibrary } from '@/app/api/avatar/library/route';
import { generateToken } from '@/lib/auth';
import { MOHAN_WORKSHOP_TWIN_SOURCES } from '@/lib/avatarStudio/mohanWorkshopTwinSources';

function makeRequest(body: unknown, token = generateToken({
  userId: 'admincrm',
  username: 'admin',
  isAdmin: true,
})): any {
  return {
    url: 'http://localhost:3000/api/avatar/library',
    headers: {
      get: (name: string) => name.toLowerCase() === 'authorization' ? `Bearer ${token}` : null,
    },
    json: async () => body,
  };
}

describe('Mohan workshop twin-look library seeding', () => {
  const seededKeys = new Set<string>();
  const existingVideos = new Set<string>();
  let insertedSourceRows: unknown[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    seededKeys.clear();
    existingVideos.clear();
    insertedSourceRows = [];
    jest.mocked(bunnyExecute).mockImplementation(async (statement: any) => {
      const sql = typeof statement === 'string' ? statement : statement.sql;
      const args = typeof statement === 'string' ? [] : statement.args || [];

      if (sql.includes('SELECT seed_key FROM avatar_library_seed_state_sql')) {
        return { rows: seededKeys.has(args[0]) ? [{ seed_key: args[0] }] : [] } as any;
      }
      if (sql.includes('SELECT id FROM avatar_generation_outputs_sql WHERE id = ? OR video_url = ?')) {
        return { rows: existingVideos.has(args[1]) ? [{ id: args[0] }] : [] } as any;
      }
      if (sql.includes('INSERT INTO avatar_generation_outputs_sql')) {
        existingVideos.add(args[8]);
        insertedSourceRows.push(args);
        return { rowsAffected: 1 } as any;
      }
      if (sql.includes('INSERT INTO avatar_library_seed_state_sql')) {
        seededKeys.add(args[0]);
        return { rowsAffected: 1 } as any;
      }
      throw new Error(`Unexpected SQL in test: ${sql}`);
    });
  });

  it('adds all seven supplied source recordings once and leaves them deleted after initialization', async () => {
    const firstResponse = await postAvatarLibrary(makeRequest({
      action: 'ensure_mohan_workshop_twin_sources',
    }));
    const firstResult = await firstResponse.json();

    expect(firstResult).toMatchObject({
      success: true,
      addedCount: 7,
      total: 7,
    });
    expect(insertedSourceRows).toHaveLength(7);
    expect(insertedSourceRows.map((row: any) => row[8])).toEqual(
      MOHAN_WORKSHOP_TWIN_SOURCES.map((source) => source.videoUrl)
    );
    expect(insertedSourceRows.every((row: any) =>
      row[3] === 'mohan_workshop_twin_source' &&
      row[5] === 'not_verified' &&
      row[6] === 0 &&
      row[9] === null &&
      row[10].includes('AI generation not performed')
    )).toBe(true);

    existingVideos.clear();
    const secondResponse = await postAvatarLibrary(makeRequest({
      action: 'ensure_mohan_workshop_twin_sources',
    }));
    const secondResult = await secondResponse.json();

    expect(secondResult).toMatchObject({
      success: true,
      addedCount: 0,
      total: 7,
    });
    expect(insertedSourceRows).toHaveLength(7);
  });
});
