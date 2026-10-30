'use client';

import { crmPlannerStorage } from '@/lib/crmPlannerMongoStorage';
import EnhancedCalendar from '@/app/life-planner/dashboard/calendar/calendar-new';

export default function PlannerCalendar() {
  return (
    <EnhancedCalendar
      storageBackend={crmPlannerStorage as any}
      backUrl=""
      backLabel="Back to CRM"
    />
  );
}
