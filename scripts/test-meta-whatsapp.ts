import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { sendWhatsAppText } from '../lib/whatsapp';

dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function test() {
  console.log('Testing Meta WhatsApp Outbound...');
  try {
    // 9075358557 was requested by the user
    const result = await sendWhatsAppText('919075358557', 'Hello from Swaryoga Meta WhatsApp Test!');
    console.log('Successfully sent message:', result);
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}

test();
