import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyAdminAccess, handleCrmError } from '@/lib/crm-handlers';
import { getLead, getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

/**
 * Sync messages from WhatsApp bridge to CRM database
 * This endpoint fetches all sent messages from the bridge and logs them in the CRM
 * Used when messages are sent directly through the bridge without CRM API
 */

export async function POST(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const WhatsAppMessage = getWhatsAppMessage();
    const Lead = getLead();

    await connectDB();

    const bridgeUrl = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://52.91.198.23:3333';
    const bridgeSecret = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

    // Fetch all chats from the bridge
    console.log('[sync-bridge] Fetching chats from bridge...');
    const chatsRes = await fetch(`${bridgeUrl}/chats`, {
      method: 'GET',
      headers: {
        'x-bridge-secret': bridgeSecret,
      },
    });

    if (!chatsRes.ok) {
      throw new Error(`Bridge /chats failed: ${chatsRes.statusText}`);
    }

    const chatsData = await chatsRes.json();
    const chats = chatsData.chats || [];

    console.log(`[sync-bridge] Found ${chats.length} chats on bridge`);

    let syncedCount = 0;
    let skippedCount = 0;

    // For each chat, fetch messages
    for (const chat of chats) {
      try {
        const chatId = chat.id || chat.chatId;
        if (!chatId) continue;

        // Extract phone number from chatId (format: "919876543210@c.us")
        const phoneMatch = chatId.match(/^(\d+)@/);
        if (!phoneMatch) continue;

        const phoneNumber = phoneMatch[1];

        // Check if we already have messages from this chat
        const existing = await WhatsAppMessage.countDocuments({
          phoneNumber,
          direction: 'outbound',
        });

        // If we already have messages from this phone, skip to avoid duplicates
        if (existing > 0) {
          console.log(`[sync-bridge] Chat ${phoneNumber} already has ${existing} messages, skipping`);
          skippedCount++;
          continue;
        }

        // Fetch messages from this chat on the bridge
        const messagesRes = await fetch(`${bridgeUrl}/messages/${chatId}`, {
          method: 'GET',
          headers: {
            'x-bridge-secret': bridgeSecret,
          },
        });

        if (!messagesRes.ok) {
          console.warn(`[sync-bridge] Failed to fetch messages for ${chatId}`);
          continue;
        }

        const messagesData = await messagesRes.json();
        const messages = messagesData.messages || [];

        // Filter for outgoing messages only
        const outgoingMessages = messages.filter(
          (msg: any) => msg.fromMe === true || msg.direction === 'outbound'
        );

        console.log(
          `[sync-bridge] Chat ${phoneNumber}: ${outgoingMessages.length} outgoing messages`
        );

        // Find or create the lead for this phone number
        let lead = await Lead.findOne({ phoneNumber });
        if (!lead) {
          console.log(`[sync-bridge] Creating new lead for ${phoneNumber}`);
          lead = await Lead.create({
            phoneNumber,
            name: chat.name || `Contact ${phoneNumber}`,
            source: 'whatsapp_bridge_sync',
          });
        }

        // Log each outgoing message
        for (const msg of outgoingMessages) {
          try {
            const messageText = msg.body || msg.messageContent || '';
            const timestamp = msg.timestamp || new Date();

            // Check if message already exists (by timestamp and content hash)
            const exists = await WhatsAppMessage.findOne({
              leadId: lead._id,
              phoneNumber,
              messageContent: messageText,
              sentAt: new Date(timestamp * 1000),
            });

            if (exists) {
              console.log(
                `[sync-bridge] Message already exists: ${messageText.substring(0, 30)}...`
              );
              continue;
            }

            // Create message record
            await WhatsAppMessage.create({
              leadId: lead._id,
              phoneNumber,
              messageContent: messageText,
              direction: 'outbound',
              messageType: 'text',
              status: 'sent',
              sentAt: new Date(timestamp * 1000),
              sentByLabel: 'bridge_sync',
              provider: 'whatsapp_web_bridge',
              waMessageId: msg.id || undefined,
            });

            syncedCount++;
            console.log(`[sync-bridge] ✅ Logged message: "${messageText.substring(0, 50)}..."`);
          } catch (msgErr) {
            console.error(`[sync-bridge] Error logging message:`, msgErr);
          }
        }
      } catch (chatErr) {
        console.error(`[sync-bridge] Error processing chat:`, chatErr);
      }
    }

    console.log(
      `[sync-bridge] Sync complete: ${syncedCount} new messages, ${skippedCount} chats skipped`
    );

    return NextResponse.json({
      success: true,
      message: 'Sync complete',
      syncedCount,
      skippedCount,
      totalChats: chats.length,
    });
  } catch (error) {
    console.error('[sync-bridge] Error:', error);
    return handleCrmError(error, 'POST sync-bridge-messages');
  }
}
