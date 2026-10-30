import { redirect } from 'next/navigation';

// The Planner Dashboard has no standalone index — land on the comprehensive
// dashboard so the bare /admin/crm/planner-dashboard URL never 404s.
export const dynamic = 'force-dynamic';

export default function PlannerDashboardIndex() {
  redirect('/admin/crm/planner-dashboard/comprehensive-dashboard');
}
