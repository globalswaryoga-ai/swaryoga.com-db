import { Metadata } from 'next';
import { getFormById } from '@/lib/bunny-forms-db';

type Props = {
  children: React.ReactNode;
};

export async function generateMetadata(props: {
  searchParams: Promise<{ w?: string; workshopId?: string }>;
}): Promise<Metadata> {
  const params = await props.searchParams;
  const formId = params?.w || params?.workshopId || '';

  let title = 'Swar Yoga Enquiry Form';
  let description = 'Fill out the official enquiry form for Swar Yoga Workshops & Programs.';
  let imageUrl = 'https://swaryoga.com/images/workshops/swar-yoga-basic.png';

  if (formId) {
    try {
      const form = await getFormById(formId);
      if (form) {
        if (form.workshopName) title = `${form.workshopName} | Swar Yoga`;
        if (form.description) description = form.description.slice(0, 160);
        if (form.workshopImage) imageUrl = form.workshopImage;
      }
    } catch (e) {
      console.error('[generateMetadata] Error fetching form for OG image:', e);
    }
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: formId ? `https://swaryoga.com/enquiry?w=${formId}` : 'https://swaryoga.com/enquiry',
      siteName: 'Swar Yoga',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function EnquiryLayout(props: Props & {
  searchParams: Promise<{ w?: string; workshopId?: string }>;
}) {
  const searchParams = await props.searchParams;
  return <>{props.children}</>;
}
