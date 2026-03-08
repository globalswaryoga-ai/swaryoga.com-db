import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import BillingPendingContent from './content';

export default function BillingPendingPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <BillingPendingContent />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gray-50 py-16 px-4">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </section>
  );
}
