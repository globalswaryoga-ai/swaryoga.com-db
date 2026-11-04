/**
 * @jest-environment node
 */
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import { saveKnowledgeSource } from '@/lib/mohanRag/knowledgeRepository';

jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyBatch: jest.fn().mockResolvedValue([]),
  bunnyExecute: jest.fn().mockResolvedValue({ rows: [], rowsAffected: 0 }),
  isBunnyDatabaseConfigured: jest.fn().mockReturnValue(true),
}));

jest.mock('@/lib/ragRetrieval', () => ({
  chunkText: jest.fn().mockReturnValue(['transcript chunk']),
}));

describe('Mohan RAG imported knowledge status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (bunnyBatch as jest.Mock).mockResolvedValue([]);
    (bunnyExecute as jest.Mock).mockResolvedValue({ rows: [], rowsAffected: 0 });
  });

  it('keeps new media transcripts as drafts until an admin approves them', async () => {
    const source = await saveKnowledgeSource({
      moduleId: 'level1',
      title: 'Lesson MP4',
      content: 'Timestamped transcript text.',
      sourceType: 'mp4',
      originalFileName: 'lesson.mp4',
      originalFileUrl: 'https://swaryogacrm.b-cdn.net/lesson.mp4',
      extractionType: 'timestamped_transcription',
      status: 'draft',
    }, 'admin');

    expect(source.status).toBe('draft');
    const sourceBatch = (bunnyBatch as jest.Mock).mock.calls
      .map(([statements]) => statements)
      .find(statements => statements.some((statement: { sql: string }) => statement.sql.includes('INSERT INTO mohan_rag_sources_sql')));
    const insert = sourceBatch.find((statement: { sql: string }) => statement.sql.includes('INSERT INTO mohan_rag_sources_sql'));
    expect(insert.args[12]).toBe('draft');
    expect(insert.sql).toContain('status=excluded.status');
  });
});
