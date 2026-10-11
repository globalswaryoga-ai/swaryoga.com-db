import { requestsImage, boundedCreativeHistory } from '@/lib/creativeRequest';

describe('Creative request routing', () => {
  it.each(['create one image', 'create an image', 'make a professional poster', 'generate two images'])('recognizes %s', prompt => {
    expect(requestsImage(prompt)).toBe(true);
  });
  it('does not mistake ordinary copy for an image request', () => {
    expect(requestsImage('write workshop welcome text')).toBe(false);
  });
  it('bounds history and strips binary media and unrelated properties', () => {
    const history = boundedCreativeHistory(Array.from({ length: 30 }, () => ({
      role: 'user', content: 'x'.repeat(9000), imageUrl: 'data:image/png;base64,AAAA',
    })));
    expect(history).toHaveLength(8);
    expect(history.every(message => message.content.length === 1500)).toBe(true);
    expect(JSON.stringify(history)).not.toContain('imageUrl');
    expect(boundedCreativeHistory([{ content: 'data:image/png;base64,AAAA' }])[0].content).toBe('[Image omitted]');
  });
});
