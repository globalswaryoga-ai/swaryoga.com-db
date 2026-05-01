/**
 * Scheduler for auto-deleting inactive tenant data (30-day grace period)
 * Called by: /api/admin/crm/inactive-cleanup/run
 *
 * Process:
 * 1. Day 0-10: Subscription expired
 * 2. Day 10-20: Send first warning (will delete in 10 days)
 * 3. Day 20-25: Send final warning (will delete in 5 days)
 * 4. Day 30+: Auto-delete all data
 */

import { connectDB } from '@/lib/db';
import { deleteTenantData } from '@/lib/crm/tenantDataDeletion';

export interface CleanupSummary {
  warned20Day: number;
  warned25Day: number;
  deleted: number;
  errors: Array<{ userId: string; error: string }>;
}

/**
 * Get subscriptions that expired >30 days ago (due for deletion)
 */
async function getAccountsDueForDeletion() {
  await connectDB();
  const { getCRMSubscription } = await import('@/lib/db');
  const CRMSubscription = getCRMSubscription();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  return CRMSubscription.find({
    status: { $in: ['expired', 'cancelled'] },
    $or: [
      { subscriptionEndsAt: { $exists: true, $lte: thirtyDaysAgo } },
      { trialEndsAt: { $exists: true, $lte: thirtyDaysAgo }, isTrialActive: false },
    ],
  }).lean();
}

/**
 * Get subscriptions needing warnings
 * Returns accounts that expired in the past N days and haven't been notified yet
 */
async function getAccountsNeedingWarning(daysAfterExpiry: 20 | 25) {
  await connectDB();
  const { getCRMSubscription } = await import('@/lib/db');
  const CRMSubscription = getCRMSubscription();

  // Window: accounts that expired in the past 1 day at this exact milestone
  // e.g. for day 20: accounts where expiry was between 20-21 days ago
  const targetDayMs = daysAfterExpiry * 24 * 60 * 60 * 1000;
  const windowStartMs = (daysAfterExpiry + 1) * 24 * 60 * 60 * 1000;

  const targetDate = new Date(Date.now() - targetDayMs);
  const windowStart = new Date(Date.now() - windowStartMs);

  // Find accounts expired in the window that haven't been notified yet
  return CRMSubscription.find({
    status: { $in: ['expired', 'cancelled'] },
    $or: [
      {
        subscriptionEndsAt: { $exists: true, $gte: windowStart, $lte: targetDate },
        autoDeleteNotifiedDays: { $nin: [daysAfterExpiry] },
      },
      {
        trialEndsAt: { $exists: true, $gte: windowStart, $lte: targetDate },
        isTrialActive: false,
        autoDeleteNotifiedDays: { $nin: [daysAfterExpiry] },
      },
    ],
  }).lean();
}

/**
 * Send warning notification (currently console.log, can integrate email/SMS later)
 */
function sendWarningNotification(
  userId: string,
  daysUntilDeletion: number,
  expiryDate: Date | string
) {
  const message = `⚠️ [WARNING] Inactive Account - Data scheduled for deletion in ${daysUntilDeletion} days`;
  console.log(`${message} | userId=${userId} | expiryDate=${expiryDate}`);

  // Future hook: send email/SMS notification
  // await sendWarningEmail(userId, daysUntilDeletion, expiryDate);
}

/**
 * Mark warning as sent to prevent duplicate notifications
 */
async function markWarningNotified(userId: string, daysAfterExpiry: 20 | 25) {
  await connectDB();
  const { getCRMSubscription } = await import('@/lib/db');
  const CRMSubscription = getCRMSubscription();

  await CRMSubscription.updateOne(
    { userId },
    { $addToSet: { autoDeleteNotifiedDays: daysAfterExpiry } }
  );
}

/**
 * Run the full cleanup cycle
 * Returns counts of warned/deleted accounts and any errors
 */
export async function runInactiveAccountCleanup(dryRun = true): Promise<CleanupSummary> {
  const summary: CleanupSummary = {
    warned20Day: 0,
    warned25Day: 0,
    deleted: 0,
    errors: [],
  };

  try {
    console.log(`[Inactive Account Cleanup] Starting (dryRun=${dryRun})`);

    // === WARNINGS ===
    if (!dryRun) {
      // Send 20-day warning (10 days until deletion)
      const accounts20 = await getAccountsNeedingWarning(20);
      for (const account of accounts20) {
        try {
          const expiryDate = account.subscriptionEndsAt || account.trialEndsAt;
          sendWarningNotification(account.userId, 10, expiryDate);
          await markWarningNotified(account.userId, 20);
          summary.warned20Day++;
        } catch (err: any) {
          summary.errors.push({ userId: account.userId, error: `Warning 20d: ${err.message}` });
        }
      }

      // Send 25-day warning (5 days until deletion)
      const accounts25 = await getAccountsNeedingWarning(25);
      for (const account of accounts25) {
        try {
          const expiryDate = account.subscriptionEndsAt || account.trialEndsAt;
          sendWarningNotification(account.userId, 5, expiryDate);
          await markWarningNotified(account.userId, 25);
          summary.warned25Day++;
        } catch (err: any) {
          summary.errors.push({ userId: account.userId, error: `Warning 25d: ${err.message}` });
        }
      }
    }

    // === DELETIONS ===
    const inactiveAccounts = await getAccountsDueForDeletion();
    console.log(`[Inactive Account Cleanup] Found ${inactiveAccounts.length} accounts eligible for deletion`);

    if (!dryRun) {
      const { getCRMSubscription } = await import('@/lib/db');
      const CRMSubscription = getCRMSubscription();

      for (const account of inactiveAccounts) {
        try {
          console.log(`[Inactive Account Cleanup] Deleting data for userId=${account.userId}`);
          await deleteTenantData(account.userId, 'auto-cleanup');

          // Mark as data-deleted to prevent re-processing
          await CRMSubscription.updateOne({ userId: account.userId }, { status: 'data_deleted' });

          summary.deleted++;
        } catch (err: any) {
          console.error(`[Inactive Account Cleanup] Failed to delete data for ${account.userId}:`, err);
          summary.errors.push({
            userId: account.userId,
            error: err.message || 'Unknown error',
          });
        }
      }
    } else {
      summary.deleted = inactiveAccounts.length;
    }

    console.log(`[Inactive Account Cleanup] Complete - ${summary.deleted} deleted, ${summary.errors.length} errors`);
    return summary;
  } catch (error: any) {
    console.error('[Inactive Account Cleanup] Fatal error:', error);
    throw error;
  }
}

/**
 * Get a preview of accounts that would be affected (for GET dry-run)
 */
export async function getCleanupPreview() {
  const accounts = await getAccountsDueForDeletion();
  const accounts20 = await getAccountsNeedingWarning(20);
  const accounts25 = getAccountsNeedingWarning(25);

  return {
    accountsDueForDeletion: accounts.length,
    accountsFor20DayWarning: accounts20.length,
    accountsFor25DayWarning: (await accounts25).length,
  };
}
