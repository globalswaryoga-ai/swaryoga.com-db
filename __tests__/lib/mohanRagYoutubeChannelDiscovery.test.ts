/**
 * @jest-environment node
 */
import {
  buildChannelDiscoveryArgs,
  isAllowedSwarYogaChannelUrl,
  mapChannelEntries,
} from '@/lib/mohanRag/youtubeChannelDiscovery';

jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyBatch: jest.fn().mockResolvedValue([]),
  bunnyExecute: jest.fn().mockResolvedValue({ rows: [] }),
}));

describe('Mohan RAG YouTube channel discovery', () => {
  it('only accepts the configured Swar Yoga channel URL', () => {
    expect(isAllowedSwarYogaChannelUrl('https://www.youtube.com/@Swar-Yoga/videos')).toBe(true);
    expect(isAllowedSwarYogaChannelUrl('https://www.youtube.com/@Swar-Yoga')).toBe(false);
    expect(isAllowedSwarYogaChannelUrl('https://youtube.com.evil.example/@Swar-Yoga')).toBe(false);
    expect(isAllowedSwarYogaChannelUrl('http://www.youtube.com/@Swar-Yoga')).toBe(false);
  });

  it('builds a flat metadata-only yt-dlp request and optionally uses server cookies', () => {
    expect(buildChannelDiscoveryArgs('https://www.youtube.com/@Swar-Yoga/videos')).toEqual([
      '--flat-playlist', '--dump-single-json', '--playlist-end', '1000',
      '--no-warnings', 'https://www.youtube.com/@Swar-Yoga/videos',
    ]);
    expect(buildChannelDiscoveryArgs('https://www.youtube.com/@Swar-Yoga/videos', '/secure/cookies.txt')).toContain('--cookies');
    expect(buildChannelDiscoveryArgs('https://www.youtube.com/@Swar-Yoga/videos', '/secure/cookies.txt')).toContain('/secure/cookies.txt');
    expect(() => buildChannelDiscoveryArgs('https://example.com/@Swar-Yoga')).toThrow('Only the configured Swar Yoga');
  });

  it('normalizes and deduplicates channel entries without inventing access or language data', () => {
    const videos = mapChannelEntries({
      entries: [
        { id: 'abcdefghijk', title: 'Swar Yoga', duration: 183, availability: 'public', language: 'mr', upload_date: '20260101' },
        { id: 'abcdefghijk', title: 'Duplicate entry' },
        { id: 'invalid', title: 'Bad identifier' },
        { id: 'mnopqrstuvw', title: 'Members lesson', availability: 'subscriber_only' },
      ],
    });

    expect(videos).toHaveLength(2);
    expect(videos[0]).toMatchObject({
      videoId: 'abcdefghijk',
      videoUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
      title: 'Swar Yoga',
      durationSeconds: 183,
      availability: 'public',
      language: 'mr',
    });
    expect(videos[1]).toMatchObject({
      videoId: 'mnopqrstuvw',
      availability: 'subscriber_only',
      language: '',
      durationSeconds: null,
    });
  });
});
