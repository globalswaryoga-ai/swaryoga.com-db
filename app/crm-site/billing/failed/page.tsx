import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import BillingFailedContent from './content';

export default function BillingFailedPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <BillingFailedContent />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gray-50 py-16 px-4">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </section>
  );
}
