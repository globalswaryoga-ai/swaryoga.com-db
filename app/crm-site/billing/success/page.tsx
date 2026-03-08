import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import BillingSuccessContent from './content';

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <BillingSuccessContent />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </section>
  );
}
