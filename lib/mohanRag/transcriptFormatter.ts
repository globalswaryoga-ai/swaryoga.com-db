/**
 * Standardizes raw speech transcripts so each timestamped segment
 * and Minute block sits on its own distinct line.
 * 
 * Before:
 *   आहेत.[04:55-04:59] का ज्यांचे आयुष्यमान...[04:59-05:01] लक्षात आलं?Minute 05:00-06:00[05:01-05:06] म्हणून भारतात...
 * 
 * After:
 *   आहेत.
 *   [04:55–04:59] का ज्यांचे आयुष्यमान...
 *   [04:59–05:01] लक्षात आलं?
 * 
 *   Minute 05:00–06:00
 *   [05:01–05:06] म्हणून भारतात...
 */
export function formatTranscriptLines(text: string): string {
  if (!text || typeof text !== 'string') return '';

  return text
    // 1. Separate Minute headers with newlines before and after
    .replace(/(?:\r?\n)*\s*(Minute\s+\d{1,2}(?::\d{2})*[-–]\d{1,2}(?::\d{2})*)\s*(?:\r?\n)*/gi, '\n\n$1\n')
    // 2. Put every bracketed timestamp (along with preceding emotion/face cues if any) on its own line
    .replace(/(?:\r?\n)*\s*((?:\[(?:[a-z_]+:\d{1,3}|face:[a-z_]+)\]\s*)*\[\d{1,2}(?::\d{2})*[-–]\d{1,2}(?::\d{2})*\])\s*/gi, '\n$1 ')
    // 3. For any standalone timestamp without cues that was missed
    .replace(/(?:\r?\n)*\s*(\[\d{1,2}(?::\d{2})*[-–]\d{1,2}(?::\d{2})*\])\s*/g, '\n$1 ')
    // 4. Collapse 3 or more consecutive newlines into 2
    .replace(/\n{3,}/g, '\n\n')
    // 5. Trim leading/trailing whitespace
    .trim();
}
