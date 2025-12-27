'use client';

import { useRouter } from 'next/navigation';

export default function WorkshopDetailAliasPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  
  // Redirect to the workshops route
  if (typeof window !== 'undefined') {
    router.push(`/workshops/${params.id}`);
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting...</p>
    </div>
  );
}
