import { redirect } from 'next/navigation';

type Props = {
  params: { id: string };
};

// Legacy funnel URL: always send user to the global registration page.
export default function RegisterNowFunnelPage({ params }: Props) {
  redirect(`/registernow?workshop=${encodeURIComponent(params?.id)}`);
}
