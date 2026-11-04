/**
 * @jest-environment node
 */
import { parseTranscriptTopicScreening } from '@/lib/mohanRag/transcriptTopicScreening';

describe('Mohan RAG transcript topic screening', () => {
  it('accepts a valid screening result and bounds display fields', () => {
    expect(parseTranscriptTopicScreening(JSON.stringify({
      relevant: true,
      topic: 'Swar Yoga breathing',
      confidence: 0.92,
      rationale: 'The transcript discusses nostril-based breathing practices.',
    }))).toEqual({
      relevant: true,
      topic: 'Swar Yoga breathing',
      confidence: 0.92,
      rationale: 'The transcript discusses nostril-based breathing practices.',
    });
  });

  it('accepts fenced JSON and rejects malformed screening output', () => {
    expect(parseTranscriptTopicScreening('```json\n{"relevant":false,"topic":"other","confidence":0.8,"rationale":"Unrelated content."}\n```').relevant).toBe(false);
    expect(() => parseTranscriptTopicScreening('not json')).toThrow();
    expect(() => parseTranscriptTopicScreening('{"relevant":true,"topic":"yoga","confidence":3,"rationale":"bad confidence"}')).toThrow('required');
  });
});
