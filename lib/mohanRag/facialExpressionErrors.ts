export function summarizeFacialExtractionError(error: string): string {
  if (/sign in to confirm|not a bot/i.test(error)) {
    return 'YouTube blocked the download and requires an authorized session. Configure YOUTUBE_COOKIES_FILE with a readable Netscape cookies file from an account permitted to view this video, then retry.';
  }

  const runtimeError = error.match(/RuntimeError:\s*(.+?)(?:\r?\n|$)/);
  if (runtimeError) return runtimeError[1].trim();

  if (/^Command failed:/i.test(error)) {
    return 'Facial extraction failed. Check the server logs for technical details.';
  }

  return error.trim().slice(0, 500);
}
