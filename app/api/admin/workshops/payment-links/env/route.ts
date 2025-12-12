// Payment Links API - Reads/writes to .env.payment file
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { PaymentLink } from '@/lib/workshopDatabase';

const ENV_PAYMENT_PATH = join(process.cwd(), '.env.payment');

function readPaymentLinksFromFile(): PaymentLink[] {
  try {
    const content = readFileSync(ENV_PAYMENT_PATH, 'utf-8');
    const lines = content.split('\n');
    const links: PaymentLink[] = [];
    const normalizedLines: string[] = [];
    let hasConversion = false;
    const warnings: string[] = [];

    type SectionState = {
      language: PaymentLink['language'];
      mode: PaymentLink['mode'];
      currency: PaymentLink['currency'];
    };

    const sectionState: SectionState = {
      language: 'hindi',
      mode: 'online',
      currency: 'INR',
    };

    const LANGUAGES: PaymentLink['language'][] = ['hindi', 'english', 'marathi'];
    const MODES: PaymentLink['mode'][] = ['online', 'offline', 'residential', 'recorded'];

    const updateSectionState = (line: string) => {
      const normalizedHeader = line.replace(/#/g, '').trim().toLowerCase();

      const langMatch = LANGUAGES.find(lang => normalizedHeader.includes(lang));
      if (langMatch) {
        sectionState.language = langMatch;
      }

      const modeMatch = MODES.find(mode => normalizedHeader.includes(mode));
      if (modeMatch) {
        sectionState.mode = modeMatch;
      }

      sectionState.currency = 'INR';
      if (normalizedHeader.includes('npr')) {
        sectionState.currency = 'NPR';
      } else if (normalizedHeader.includes('usd')) {
        sectionState.currency = 'USD';
      }
    };

    for (const line of lines) {
      if (!line.trim()) {
        normalizedLines.push(line);
        continue;
      }

      if (line.trim().startsWith('#')) {
        updateSectionState(line);
        normalizedLines.push(line);
        continue;
      }

      if (!line.includes('=')) {
        normalizedLines.push(line);
        continue;
      }

      const [keyPart, ...rest] = line.split('=');
      const key = keyPart.trim();
      const value = rest.join('=').trim();

      if (!key || !value) {
        normalizedLines.push(line);
        continue;
      }

      const normalizedKey = key.startsWith('workshop/') ? key.slice(9) : key;
      const parts = normalizedKey.split('_').filter(Boolean);

      if (parts.length >= 4) {
        const currency = parts[parts.length - 1];
        const mode = parts[parts.length - 2];
        const language = parts[parts.length - 3];
        const workshopSlug = parts.slice(0, -3).join('_').toLowerCase();

        const formattedLine = `workshop/${workshopSlug}_${language.toLowerCase()}_${mode.toLowerCase()}_${currency.toUpperCase()}=${value}`;
        normalizedLines.push(formattedLine);
        const normalizedLanguage = language.toLowerCase() as PaymentLink['language'];
        const normalizedMode = mode.toLowerCase() as PaymentLink['mode'];
        const normalizedCurrency = currency.toUpperCase() as PaymentLink['currency'];

        const id = `workshop/${workshopSlug}_${normalizedLanguage}_${normalizedMode}_${normalizedCurrency}`;
        links.push({
          id,
          workshop_id: workshopSlug,
          workshop_name: workshopSlug.replace(/-/g, ' ').toUpperCase(),
          language: normalizedLanguage,
          mode: normalizedMode,
          currency: normalizedCurrency,
          payment_link: value,
        });
        continue;
      }

      if (!sectionState.language || !sectionState.mode) {
        warnings.push(`Unable to determine section context for line: ${line}`);
        normalizedLines.push(line);
        continue;
      }

      const slug = normalizedKey.replace(/\s+/g, '-').toLowerCase();
      const convertedKey = `workshop/${slug}_${sectionState.language}_${sectionState.mode}_${sectionState.currency}`;
      const convertedLine = `${convertedKey}=${value}`;
      normalizedLines.push(convertedLine);
      hasConversion = true;
      links.push({
        id: convertedKey,
        workshop_id: slug,
        workshop_name: slug.replace(/-/g, ' ').toUpperCase(),
        language: sectionState.language,
        mode: sectionState.mode,
        currency: sectionState.currency,
        payment_link: value,
      });
    }

    if (hasConversion) {
      writeFileSync(ENV_PAYMENT_PATH, normalizedLines.join('\n'), 'utf-8');
    }

    if (warnings.length) {
      console.warn('Payment link parsing warnings:', warnings);
    }

    return links;
  } catch (err) {
    console.error('Error reading payment links file:', err);
    return [];
  }
}

function writePaymentLinksToFile(links: PaymentLink[]): string | null {
  try {
    const content = readFileSync(ENV_PAYMENT_PATH, 'utf-8');
    const lines = content.split('\n');

    // Update or add each link
    for (const link of links) {
      const newLine = `workshop/${link.workshop_id}_${link.language}_${link.mode}_${link.currency}=${link.payment_link}`;

      const lineIndex = lines.findIndex(l => l.startsWith(`workshop/${link.workshop_id}_${link.language}_${link.mode}_${link.currency}`));
      if (lineIndex >= 0) {
        lines[lineIndex] = newLine;
      } else {
        lines.push(newLine);
      }
    }

    const result = lines.join('\n');
    writeFileSync(ENV_PAYMENT_PATH, result, 'utf-8');
    return null;
  } catch (err) {
    return String(err);
  }
}

export async function GET(): Promise<Response> {
  try {
    const links = readPaymentLinksFromFile();
    return NextResponse.json({ data: links });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const link = (await request.json()) as PaymentLink;
    const links = readPaymentLinksFromFile();

    links.push(link);

    const error = writePaymentLinksToFile(links);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ data: link }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  try {
    const { id, ...updates } = (await request.json()) as PaymentLink & { id: string };
    const links = readPaymentLinksFromFile();

    const index = links.findIndex(l => l.id === id);
    if (index < 0) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
    }

    links[index] = { ...links[index], ...updates };

    const error = writePaymentLinksToFile(links);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ data: links[index] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    let links = readPaymentLinksFromFile();
    links = links.filter(l => l.id !== id);

    const error = writePaymentLinksToFile(links);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
