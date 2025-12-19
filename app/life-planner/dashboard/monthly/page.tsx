import { redirect } from 'next/navigation';

export default function MonthlyViewPage() {
  redirect('/life-planner/dashboard/daily');
}
