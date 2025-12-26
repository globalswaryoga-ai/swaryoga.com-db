'use client';

import WorkshopDetailPage from '../../workshops/[id]/page';

export default function WorkshopDetailAliasPage({ params }: { params: { id: string } }) {
  return <WorkshopDetailPage params={params} />;
}
