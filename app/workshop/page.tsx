import { permanentRedirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

function toQueryString(searchParams?: SearchParams): string {
  if (!searchParams) return '';
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else if (typeof value === 'string') {
      params.set(key, value);
    }
  }

  return params.toString();
}

export default function WorkshopIndexPage({ searchParams }: { searchParams?: SearchParams }) {
  const queryString = toQueryString(searchParams);
  permanentRedirect(`/workshops${queryString ? `?${queryString}` : ''}`);
}
