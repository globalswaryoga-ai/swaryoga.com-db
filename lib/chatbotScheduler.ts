import { bunnyChatbotMetaRuntime } from '@/lib/bunnyChatbotMetaRuntime';

export type ChatbotSchedulerResult = {
  scannedActions: number;
  executedActions: number;
  delayedMessages: number;
  timeoutActions: number;
  failedActions: number;
  deferredEvents?: number;
  replayedEvents?: number;
  actionResults: Array<{ actionId: string; actionType: string; status: 'ok' | 'error'; error?: string }>;
};

/** Existing chatbot-actions/run GET/POST cron calls this Bunny-only processor. */
export async function runDueChatbotActions(options?: { now?: Date; limit?: number }): Promise<ChatbotSchedulerResult> {
  return bunnyChatbotMetaRuntime.runDue(options);
}
