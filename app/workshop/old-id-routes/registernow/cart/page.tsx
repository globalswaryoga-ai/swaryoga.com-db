import { redirect } from 'next/navigation';

// Legacy funnel URL: normalize to global cart page so the URL is always /cart.
export default function WorkshopFunnelCartPage() {
  redirect('/cart');
}
