import { connectDB } from '@/lib/db';
import { getBroadcastList, getBroadcastListMember } from '@/lib/schemas/enterpriseSchemas';

/**
 * Automatically adds a lead to the "All CRM Leads" broadcast list.
 * This list is used for global marketing and updates.
 */
export async function addLeadToMainBroadcastList(lead: any) {
  try {
    await connectDB();
    const BroadcastList = getBroadcastList();
    const BroadcastListMember = getBroadcastListMember();

    // 1. Find or create the "All CRM Leads" list
    let list = await BroadcastList.findOne({ name: 'All CRM Leads' });
    if (!list) {
      list = await BroadcastList.create({
        name: 'All CRM Leads',
        description: 'Global broadcast list for all CRM leads',
      });
    }

    // 2. Check if lead is already a member
    const existingMember = await BroadcastListMember.findOne({
      broadcastListId: list._id,
      leadId: lead._id,
    });

    if (existingMember) {
      return { success: true, alreadyMember: true };
    }

    // 3. Add the member
    await BroadcastListMember.create({
      broadcastListId: list._id,
      leadId: lead._id,
      phoneNumber: lead.phoneNumber,
      name: lead.name || '',
      status: 'active',
      addedAt: new Date(),
    });

    return { success: true, added: true };
  } catch (error) {
    console.error('Error adding lead to Main Broadcast List:', error);
    return { success: false, error };
  }
}
