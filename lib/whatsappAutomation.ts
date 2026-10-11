import { bunnyChatbotMetaRuntime } from '@/lib/bunnyChatbotMetaRuntime';
import { getBunnyLeadById } from '@/lib/bunnyLeadsRepository';
import { ChatbotRuntimeError, type ChatbotInboundInput } from '@/lib/bunnyChatbotRuntimeEngine';

export { ChatbotRuntimeError };
export const getChatbotFlowStateForLead = bunnyChatbotMetaRuntime.readState;
export const cancelChatbotFlowForLead = bunnyChatbotMetaRuntime.cancel;

export async function handleInboundWhatsAppAutomations(input: ChatbotInboundInput) {
  return bunnyChatbotMetaRuntime.inbound(input);
}

/** Compatibility entrypoint for builder start actions; errors are not hidden. */
export async function startChatbotFlowForLead(input: {
  leadId: string;
  flowId: string;
  phoneNumber: string;
  ownerUserId?: string;
}): Promise<{ success: boolean; message: string; firstReply?: any; sentCount?: number; currentNode?: string | null; flowCompleted?: boolean }> {
  const lead = await getBunnyLeadById(input.leadId);
  if (!lead) return { success: false, message: 'Lead not found' };
  if (!input.ownerUserId) return { success: false, message: 'An authorized flow owner is required' };
  const owner = input.ownerUserId;
  try {
    return await bunnyChatbotMetaRuntime.start({ ...input, ownerUserId: owner });
  } catch (error) {
    if (error instanceof ChatbotRuntimeError) return { success: false, message: error.message };
    throw error;
  }
}
