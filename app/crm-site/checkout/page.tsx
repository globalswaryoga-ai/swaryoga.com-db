import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import CheckoutContent from './content';

export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CheckoutContent />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <section className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-swar-primary mx-auto mb-4" />
        <p className="text-gray-600">Loading checkout...</p>
      </div>
    </section>
  );
}
