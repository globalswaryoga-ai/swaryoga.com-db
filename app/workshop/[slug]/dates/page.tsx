'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

export default function DatesRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  useEffect(() => {
    // Redirect to select-date page
    router.push(`/workshop/${slug}/select-date`);
  }, [slug, router]);

  return null;
}
