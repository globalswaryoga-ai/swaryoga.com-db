// Public API endpoint to get payment links for workshops
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Parse payment links from environment variables
function parsePaymentLinks() {
  const links: Array<{
    workshop_id: string;
    workshop_slug: string;
    mode: string;
    language: string;
    currency: string;
    payment_link: string;
  }> = [];

  // Get all environment variables that start with 'workshop/'
  Object.entries(process.env).forEach(([key, value]) => {
    if (key.startsWith('workshop/') && typeof value === 'string') {
      // Parse format: workshop/{slug}/{mode}/{language}/{currency}
      const parts = key.split('/');
      if (parts.length === 5) {
        const [_, slug, mode, language, currency] = parts;
        
        links.push({
          workshop_id: slug,
          workshop_slug: slug,
          mode,
          language,
          currency,
          payment_link: value,
        });
      }
    }
  });

  return links;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workshopSlug = searchParams.get('workshopSlug');
    const mode = searchParams.get('mode') || 'online';
    const language = searchParams.get('language') || 'hindi';
    const country = searchParams.get('country') || 'india'; // india, nepal, international

    // Map country to currency
    const currencyMap: Record<string, string> = {
      india: 'INR',
      nepal: 'INR', // Nepal also uses INR links with different conversion
      international: 'USD',
    };

    const currency = currencyMap[country.toLowerCase()] || 'INR';

    const paymentLinks = parsePaymentLinks();

    // Filter payment links
    let filteredLinks = paymentLinks;

    if (workshopSlug) {
      filteredLinks = filteredLinks.filter(link => link.workshop_slug === workshopSlug);
    }

    filteredLinks = filteredLinks.filter(link => 
      link.mode === mode &&
      link.language === language &&
      link.currency === currency
    );

    // Return first matching link or all matching links
    if (filteredLinks.length === 0) {
      return NextResponse.json(
        { 
          message: 'No payment links found for the specified criteria',
          criteria: { workshopSlug, mode, language, currency },
          data: [] 
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      message: 'Payment links retrieved successfully',
      criteria: { workshopSlug, mode, language, currency },
      data: filteredLinks,
      paymentLink: filteredLinks[0]?.payment_link, // Return first match as primary link
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching payment links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment links' },
      { status: 500 }
    );
  }
}
