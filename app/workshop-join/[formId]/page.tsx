import { Metadata } from 'next';
import { connectDB, EnquiryForm, Order } from '@/lib/db';
import JoinFormClient from './JoinFormClient';

interface Props {
  params: { formId: string };
  searchParams?: { paid?: string; payfailed?: string };
}

/**
 * Server-verify a ?paid=<cashfreeOrderId> param: it only counts as paid if there
 * is a COMPLETED order for that Cashfree id whose item belongs to THIS form.
 * This makes the group-link reveal tamper-proof (a guessed ?paid won't unlock it).
 */
async function verifyPaid(cashfreeOrderId: string | undefined, formId: string): Promise<boolean> {
  if (!cashfreeOrderId) return false;
  try {
    await connectDB();
    const order = await Order.findOne({ cashfreeOrderId: String(cashfreeOrderId), paymentStatus: 'completed' })
      .select({ items: 1 }).lean() as any;
    if (!order) return false;
    return (order.items || []).some((it: any) => it.workshopSlug === formId);
  } catch {
    return false;
  }
}

async function getForm(formId: string) {
  try {
    await connectDB();
    const form = await EnquiryForm.findOne({ formId, isActive: true }).lean() as any;
    if (!form) return null;
    return {
      formId: form.formId,
      workshopName: form.workshopName || 'Swar Yoga Workshop',
      workshopDate: form.workshopDate || '',
      workshopTime: form.workshopTime || '',
      workshopMode: form.workshopMode || 'online',
      description: form.description || '',
      workshopImage: form.workshopImage || '',
      price: form.price || 0,
      currency: form.currency || 'INR',
      feeOptions: Array.isArray(form.feeOptions) ? form.feeOptions.map((f: any) => ({ label: f.label || '', price: f.price || 0 })) : [],
      groupLink: form.groupLink || '',
      timeSlots: Array.isArray(form.timeSlots) ? form.timeSlots.map((t: any) => ({ label: t.label || '', groupLink: t.groupLink || '' })) : [],
    };
  } catch {
    return null;
  }
}

/* ── Open Graph / WhatsApp link preview metadata ── */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const form = await getForm(params.formId);

  const title = form?.workshopName
    ? `${form.workshopName} — Join Now | Swar Yoga`
    : 'Join Swar Yoga Workshop';

  const dateStr = [form?.workshopDate, form?.workshopTime].filter(Boolean).join(' · ');
  const description = form?.description
    || (dateStr ? `${dateStr} — Register now and start your Swar Yoga journey.` : 'Register now and start your Swar Yoga journey.');

  const image = form?.workshopImage || 'https://swaryoga.com/og-default.jpg';
  const url = `https://swaryoga.com/workshop-join/${params.formId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Swar Yoga',
      type: 'website',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: form?.workshopName || 'Swar Yoga Workshop',
        },
      ],
    },
    // WhatsApp uses Twitter Card tags as fallback
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    // Explicit OG tags for WhatsApp compatibility
    other: {
      'og:image': image,
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:title': title,
      'og:description': description,
      'og:url': url,
      'og:type': 'website',
      'og:site_name': 'Swar Yoga',
    },
  };
}

/* ── Page renders client component with pre-fetched data ── */
export default async function JoinFormPage({ params, searchParams }: Props) {
  const form = await getForm(params.formId);
  const paid = await verifyPaid(searchParams?.paid, params.formId);
  const payFailed = searchParams?.payfailed === '1';

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f7ee] to-[#e8f4e8] px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-500 text-sm">This link may have expired or been deactivated.</p>
        </div>
      </div>
    );
  }

  return <JoinFormClient formData={form} paid={paid} payFailed={payFailed} />;
}
