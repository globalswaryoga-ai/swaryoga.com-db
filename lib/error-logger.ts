import { bunnyExecute } from '@/lib/bunnyDatabase';

export async function logApiError(context: string, error: any, metadata: any = {}) {
  try {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error(`[API ERROR - ${context}] ${errorMsg}`);
    
    // Fallback to console, or write to a SQL table if needed.
    // For now, to prevent MongoDB timeouts, we just log and return.
    return true;
  } catch (e) {
    console.error('Failed to log API error', e);
  }
}
