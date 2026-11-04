import { summarizeFacialExtractionError } from '@/lib/mohanRag/facialExpressionErrors';

describe('summarizeFacialExtractionError', () => {
  it('explains YouTube bot-check failures without showing the command or traceback', () => {
    const summary = summarizeFacialExtractionError(
      'Command failed: /var/www/swaryoga/venv-vision/bin/python3\nERROR: [youtube] Sign in to confirm you’re not a bot\nTraceback (most recent call last):'
    );

    expect(summary).toContain('authorized session');
    expect(summary).toContain('YOUTUBE_COOKIES_FILE');
    expect(summary).not.toContain('/var/www');
    expect(summary).not.toContain('Traceback');
  });

  it('shows a concise Python runtime error instead of its traceback', () => {
    const summary = summarizeFacialExtractionError(
      'Command failed: /var/www/swaryoga/venv-vision/bin/python3\nTraceback (most recent call last):\nRuntimeError: Could not open video stream\n  File "/var/www/swaryoga/scripts/extract_facial_expressions.py"'
    );

    expect(summary).toBe('Could not open video stream');
  });

  it('replaces unrecognized subprocess dumps with a short server-log hint', () => {
    const summary = summarizeFacialExtractionError('Command failed: /private/path/worker\n' + 'x'.repeat(2000));

    expect(summary).toBe('Facial extraction failed. Check the server logs for technical details.');
  });

  it('preserves concise service errors', () => {
    expect(summarizeFacialExtractionError('Bunny Stream video has no available MP4 rendition.'))
      .toBe('Bunny Stream video has no available MP4 rendition.');
  });
});
