import { redirect } from 'next/navigation';

export default function WorkshopDetailAliasPage({ params }: { params: { id: string } }) {
  // Server-side redirect to the workshops route
  redirect(`/workshops/${params.id}`);
}
