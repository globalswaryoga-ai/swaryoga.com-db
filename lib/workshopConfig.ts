export const modeSections = [
  {
    label: 'Online',
    description: 'Live virtual batches with live instruction, recordings and Q&A.',
    filter: 'Online'
  },
  {
    label: 'Offline',
    description: 'In-studio sessions with hands-on correction and community immersion.',
    filter: 'Offline'
  },
  {
    label: 'Residential',
    description: 'Immersive campus-style retreats including food, stay and practice.',
    filter: 'Residential'
  },
  {
    label: 'Recorded',
    description: 'Self-paced archives you can access anytime from your device.',
    filter: 'Recorded'
  }
];

export const languageSections = [
  {
    label: 'Hindi',
    description: 'Rooted in Sanskrit terminology and spoken explanations.',
    filter: 'Hindi'
  },
  {
    label: 'English',
    description: 'Modern language delivery with global examples.',
    filter: 'English'
  },
  {
    label: 'Marathi',
    description: 'Regional flavor for learners in Maharashtra.',
    filter: 'Marathi'
  }
];

const slugToEnvKey = (slug: string) =>
  `NEXT_PUBLIC_PAYMENT_LINK_${slug.replace(/[^a-z0-9]+/gi, '_').toUpperCase()}`;

type WorkshopOverrideDto = {
  slug?: string;
  path?: string;
  link: string;
};

const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const parseWorkshopOverrides = (): WorkshopOverrideDto[] => {
  const raw = process.env.NEXT_PUBLIC_PAYMENT_OVERRIDES;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((entry): entry is WorkshopOverrideDto => Boolean(entry && entry.link))
        .map((entry) => ({
          slug: entry.slug ? normalizeSlug(entry.slug) : undefined,
          path: entry.path?.toLowerCase(),
          link: entry.link
        }));
    }
  } catch {
    // Ignore parse errors and fall back to slug-based links
  }

  return [];
};

const workshopOverrides = parseWorkshopOverrides();

const findWorkshopOverrideLink = (slug: string) => {
  if (!slug) return undefined;

  const normalizedSlug = normalizeSlug(slug);
  const slugMatch = workshopOverrides.find((override) => override.slug === normalizedSlug);
  if (slugMatch) return slugMatch.link;

  const pathCandidates = [`workshop/${normalizedSlug}`, `workshops/${normalizedSlug}`];
  const pathMatch = workshopOverrides.find(
    (override) => override.path && pathCandidates.includes(override.path)
  );
  if (pathMatch) return pathMatch.link;

  return workshopOverrides.find(
    (override) => override.path && override.path.endsWith(normalizedSlug)
  )?.link;
};

export const getPaymentLinkForWorkshop = (slug: string) =>
  findWorkshopOverrideLink(slug) ?? process.env[slugToEnvKey(slug)] ?? '';

export const paymentLinkKeyHint = (slug: string) => slugToEnvKey(slug);

const languages = ['hindi', 'english', 'marathi'];
const modes = ['online', 'offline', 'residential', 'recorded'];
const currencies = ['INR', 'NPR', 'USD'];

const toEnvKey = (prefix: string, language: string, mode: string, currency?: string) => {
  const parts = [prefix, language, mode];
  if (currency) parts.push(currency);
  return `NEXT_PUBLIC_${parts.join('_').toUpperCase()}`;
};

export type PaymentEntry = {
  currency: string;
  link: string;
};

export type PaymentModeSection = {
  label: string;
  name: string;
  entries: PaymentEntry[];
};

export type PaymentLanguageSection = {
  label: string;
  modes: PaymentModeSection[];
};

export const getPaymentSections = (): PaymentLanguageSection[] => {
  return languages.map((language) => ({
    label: language.charAt(0).toUpperCase() + language.slice(1),
    modes: modes.map((mode) => ({
      label: mode.charAt(0).toUpperCase() + mode.slice(1),
      name:
        process.env[toEnvKey('PAYMENT_NAME', language, mode)] ||
        `${language.charAt(0).toUpperCase() + language.slice(1)} ${mode.charAt(0).toUpperCase() + mode.slice(1)} Workshop`,
      entries: currencies.map((currency) => ({
        currency,
        link: process.env[toEnvKey('PAYMENT_LINK', language, mode, currency)] || ''
      }))
    }))
  }));
};
