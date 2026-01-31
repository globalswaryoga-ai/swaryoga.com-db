/**
 * Lead Assignment Round-Robin System
 * 
 * Automatically assigns new WhatsApp leads to admin users in a round-robin fashion.
 * Example: With batchSize=5 and 3 admins:
 *   - First 5 leads → Admin 1
 *   - Next 5 leads → Admin 2
 *   - Next 5 leads → Admin 3
 *   - Then back to Admin 1
 */

import { connectDB } from '@/lib/db';
import { getLeadAssignmentSettings } from '@/lib/schemas/enterpriseSchemas';

interface AssignmentResult {
  assigned: boolean;
  assignedToUserId?: string;
  assignedToName?: string;
  message: string;
}

/**
 * Get the next admin user for lead assignment using round-robin.
 * Updates the counters atomically to prevent race conditions.
 */
export async function getNextAssignedAdmin(): Promise<AssignmentResult> {
  try {
    await connectDB();
    const LeadAssignmentSettings = getLeadAssignmentSettings();

    // Get current settings
    const settings = await LeadAssignmentSettings.findOne({ settingKey: 'lead_assignment' });

    // Not enabled or no settings
    if (!settings || !settings.enabled) {
      return { 
        assigned: false, 
        message: 'Lead assignment is disabled' 
      };
    }

    // No active admin users configured
    const activeAdmins = (settings.adminUsers || []).filter((u: any) => u.isActive);
    if (activeAdmins.length === 0) {
      return { 
        assigned: false, 
        message: 'No active admin users configured for assignment' 
      };
    }

    const batchSize = settings.batchSize || 5;
    let currentIndex = settings.currentAdminIndex || 0;
    let currentBatch = settings.currentBatchCount || 0;

    // Ensure index is within bounds
    if (currentIndex >= activeAdmins.length) {
      currentIndex = 0;
      currentBatch = 0;
    }

    // Get current admin
    const currentAdmin = activeAdmins[currentIndex];

    // Calculate next state
    let nextIndex = currentIndex;
    let nextBatch = currentBatch + 1;

    // Check if we need to move to next admin
    if (nextBatch >= batchSize) {
      nextIndex = (currentIndex + 1) % activeAdmins.length;
      nextBatch = 0;
    }

    // Update counters atomically
    await LeadAssignmentSettings.updateOne(
      { settingKey: 'lead_assignment' },
      {
        $set: {
          currentAdminIndex: nextIndex,
          currentBatchCount: nextBatch,
          lastAssignedAt: new Date(),
        },
        $inc: { totalAssigned: 1 },
      }
    );

    return {
      assigned: true,
      assignedToUserId: currentAdmin.userId,
      assignedToName: currentAdmin.name || currentAdmin.email || currentAdmin.userId,
      message: `Assigned to ${currentAdmin.name || currentAdmin.userId} (batch ${currentBatch + 1}/${batchSize})`,
    };
  } catch (error: any) {
    console.error('[LeadAssignment] Error getting next admin:', error);
    return {
      assigned: false,
      message: `Assignment error: ${error.message}`,
    };
  }
}

/**
 * Assign a lead to the next admin in round-robin.
 * Call this when a new lead is created from WhatsApp.
 */
export async function assignLeadToNextAdmin(leadDoc: any): Promise<AssignmentResult> {
  // Skip if lead already has an assignment
  if (leadDoc.assignedToUserId) {
    return {
      assigned: false,
      message: 'Lead already has an assignment',
    };
  }

  const result = await getNextAssignedAdmin();

  if (result.assigned && result.assignedToUserId) {
    // Update the lead document
    leadDoc.assignedToUserId = result.assignedToUserId;
    await leadDoc.save();
    console.log(`[LeadAssignment] Lead ${leadDoc.phoneNumber} assigned to ${result.assignedToUserId}`);
  }

  return result;
}

/**
 * Get current assignment stats for display
 */
export async function getAssignmentStats() {
  try {
    await connectDB();
    const LeadAssignmentSettings = getLeadAssignmentSettings();
    const settings = await LeadAssignmentSettings.findOne({ settingKey: 'lead_assignment' });

    if (!settings) {
      return null;
    }

    const activeAdmins = (settings.adminUsers || []).filter((u: any) => u.isActive);
    const currentAdmin = activeAdmins[settings.currentAdminIndex] || null;

    return {
      enabled: settings.enabled,
      batchSize: settings.batchSize,
      totalAdmins: activeAdmins.length,
      currentAdminIndex: settings.currentAdminIndex,
      currentBatchCount: settings.currentBatchCount,
      currentAdmin: currentAdmin ? {
        userId: currentAdmin.userId,
        name: currentAdmin.name,
      } : null,
      totalAssigned: settings.totalAssigned,
      lastAssignedAt: settings.lastAssignedAt,
    };
  } catch (error) {
    console.error('[LeadAssignment] Error getting stats:', error);
    return null;
  }
}
