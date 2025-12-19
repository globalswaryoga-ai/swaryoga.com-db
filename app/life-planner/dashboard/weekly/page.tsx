import { redirect } from 'next/navigation';

export default function WeeklyViewPage() {
  redirect('/life-planner/dashboard/daily');
}
