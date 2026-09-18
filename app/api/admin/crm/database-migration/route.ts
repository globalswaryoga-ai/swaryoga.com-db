import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export type MigrationTaskStatus = 'completed' | 'in-progress' | 'pending' | 'blocked';

const phases = [
  {
    id: 'foundation',
    title: 'Foundation and safety',
    tasks: [
      { id: 'bunny-client', title: 'Bunny SQL client and environment configuration', status: 'completed' as MigrationTaskStatus },
      { id: 'sql-migrations', title: 'Numbered SQL migrations applied and checksummed remotely', status: 'in-progress' as MigrationTaskStatus },
      { id: 'backup', title: 'Legacy data preserved in Bunny Storage backups', status: 'completed' as MigrationTaskStatus },
    ],
  },
  {
    id: 'identity',
    title: 'CRM identity and settings',
    tasks: [
      { id: 'admin-auth', title: 'Admin authentication reads from Bunny SQL', status: 'completed' as MigrationTaskStatus },
      { id: 'crm-settings', title: 'CRM and QR settings use one Bunny SQL source', status: 'in-progress' as MigrationTaskStatus },
      { id: 'tenant-foundation', title: 'Tenants, setup, compartments, and team access use Bunny SQL', status: 'pending' as MigrationTaskStatus },
      { id: 'website-users', title: 'Public website users and login use Bunny SQL', status: 'pending' as MigrationTaskStatus },
    ],
  },
  {
    id: 'leads',
    title: 'Leads and CRM activity',
    tasks: [
      { id: 'lead-reads', title: 'Lead list and metadata reads use Bunny SQL', status: 'completed' as MigrationTaskStatus },
      { id: 'lead-writes', title: 'Lead create, update, delete, assignment, and numbering', status: 'pending' as MigrationTaskStatus },
      { id: 'lead-activity', title: 'Notes, followups, receipts, and duplicate checks', status: 'pending' as MigrationTaskStatus },
      { id: 'lead-parity', title: 'Lead count, identity, and deletion reconciliation', status: 'pending' as MigrationTaskStatus },
    ],
  },
  {
    id: 'qr',
    title: 'QR WhatsApp and messaging',
    tasks: [
      { id: 'qr-schema', title: 'QR sessions, chats, messages, queues, and receipt tables', status: 'in-progress' as MigrationTaskStatus },
      { id: 'qr-repository', title: 'Bunny repositories for QR chat and message data', status: 'in-progress' as MigrationTaskStatus },
      { id: 'qr-webhook', title: 'QR webhook, inbox, send, and broadcast paths use Bunny SQL', status: 'pending' as MigrationTaskStatus },
      { id: 'qr-archive', title: 'QR archive manifest and retention use Bunny SQL plus Bunny Storage', status: 'pending' as MigrationTaskStatus },
      { id: 'qr-privacy', title: 'Tenant isolation, deduplication, receipts, and unread parity', status: 'pending' as MigrationTaskStatus },
    ],
  },
  {
    id: 'meta',
    title: 'Meta WhatsApp and messaging',
    tasks: [
      { id: 'meta-schema', title: 'Meta messages and webhook event SQL tables', status: 'in-progress' as MigrationTaskStatus },
      { id: 'meta-repository', title: 'Bunny repository for Meta messages and conversations', status: 'in-progress' as MigrationTaskStatus },
      { id: 'meta-accounts', title: 'Meta account ownership and encrypted credentials use Bunny SQL', status: 'in-progress' as MigrationTaskStatus },
      { id: 'meta-import', title: 'Import and reconcile historical Meta messages', status: 'completed' as MigrationTaskStatus },
      { id: 'meta-accounts-import', title: 'Import historical Meta account ownership records', status: 'blocked' as MigrationTaskStatus },
      { id: 'meta-runtime', title: 'Meta webhook and inbox prefer Bunny SQL for available records', status: 'completed' as MigrationTaskStatus },
      { id: 'meta-lead-boundary', title: 'Meta account ownership and lead association no longer require MongoDB', status: 'pending' as MigrationTaskStatus },
      { id: 'meta-access', title: 'Tenant WABA ownership and lead visibility remain isolated', status: 'pending' as MigrationTaskStatus },
    ],
  },
  {
    id: 'workshops',
    title: 'Workshops and recordings',
    tasks: [
      { id: 'workshop-core', title: 'Workshop cohorts and attendance use Bunny SQL', status: 'completed' as MigrationTaskStatus },
      { id: 'workshop-reconcile', title: 'Reconcile all students, attendance, recordings, and deliveries', status: 'blocked' as MigrationTaskStatus },
      { id: 'workshop-leads', title: 'Workshop student CRM lead sync uses Bunny SQL', status: 'pending' as MigrationTaskStatus },
      { id: 'recording-links', title: 'YouTube and Bunny recording links reconcile completely', status: 'pending' as MigrationTaskStatus },
    ],
  },
  {
    id: 'remaining',
    title: 'Remaining platform modules',
    tasks: [
      { id: 'forms', title: 'Forms, signup, billing, and plan access', status: 'pending' as MigrationTaskStatus },
      { id: 'community', title: 'Community, moderation, and e-learning', status: 'pending' as MigrationTaskStatus },
      { id: 'automation', title: 'Chatbots, workflows, email, and Sadhana', status: 'pending' as MigrationTaskStatus },
      { id: 'accounting', title: 'Accounting, Tally, planner, and remaining website data', status: 'pending' as MigrationTaskStatus },
      { id: 'decommission', title: 'Remove MongoDB runtime dependencies after acceptance testing', status: 'pending' as MigrationTaskStatus },
    ],
  },
];

export async function GET(req: NextRequest) {
  const decoded = verifyToken(req.headers.get('authorization') || '');
  if (!decoded?.isAdmin || !isSuperAdmin(decoded)) {
    return apiError('Super Admin access required', 403);
  }

  const bunnyConfigured = isBunnyDatabaseConfigured();
  let bunnyReachable = false;
  let migrationTablePresent = false;
  let bunnyError: string | undefined;

  if (bunnyConfigured) {
    try {
      const result = await bunnyExecute({
        sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND (name = '__bunny_migrations' OR name = 'crm_user_settings_sql')",
        args: [],
      });
      bunnyReachable = true;
      migrationTablePresent = result.rows.some((row) => String(row.name) === '__bunny_migrations');
    } catch (error) {
      bunnyError = error instanceof Error ? error.message : 'Bunny SQL health check failed';
    }
  }

  const allTasks = phases.flatMap((phase) => phase.tasks);
  const completed = allTasks.filter((task) => task.status === 'completed').length;
  const active = allTasks.filter((task) => task.status === 'in-progress').length;
  const blocked = allTasks.filter((task) => task.status === 'blocked').length;
  const percentage = Math.round((completed / allTasks.length) * 100);

  return apiSuccess({
    generatedAt: new Date().toISOString(),
    refreshAfterSeconds: 15,
    target: 'Bunny SQL + Bunny Storage only',
    legacyMongoRuntime: 'still present until all pending tasks and acceptance checks pass',
    health: {
      bunnyConfigured,
      bunnyReachable,
      migrationTablePresent,
      bunnyError,
    },
    summary: {
      total: allTasks.length,
      completed,
      active,
      blocked,
      pending: allTasks.length - completed - active - blocked,
      percentage,
    },
    phases,
  });
}
