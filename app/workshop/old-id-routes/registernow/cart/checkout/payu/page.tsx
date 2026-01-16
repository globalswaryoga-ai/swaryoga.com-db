import { redirect } from 'next/navigation';

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function WorkshopFunnelPayuCheckoutPage({ searchParams }: Props) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams || {})) {
    if (typeof value === 'string') qs.set(key, value);
    else if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  redirect(`/checkout${suffix}`);
}
