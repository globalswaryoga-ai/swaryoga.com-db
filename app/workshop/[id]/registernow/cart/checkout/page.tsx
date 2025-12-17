import { redirect } from 'next/navigation';

type Props = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function WorkshopFunnelCheckoutRedirectPage({ searchParams }: Props) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams || {})) {
    if (typeof value === 'string') qs.set(key, value);
    else if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  // Legacy funnel URL: normalize to global checkout page so URL is always /checkout.
  redirect(`/checkout${suffix}`);
}
