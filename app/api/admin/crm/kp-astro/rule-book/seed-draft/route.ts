import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { getKpRuleBookEntry } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

// Standard-KP starting draft, organised by category. This is textbook/
// commonly-taught significator knowledge (K.S. Krishnamurti's system) — NOT
// pulled from any specific astrologer's personal toolkit, and every row is
// marked isDraft: true so the Rule Book UI flags it for review. Editing a
// row (via PATCH /rule-book/[id]) clears isDraft once the astrologer has
// verified/corrected it against their own toolkit.
const DRAFT_ENTRIES: Array<{
  category: string;
  subMatter: string;
  promiseHouses: string;
  denialHouses: string;
  dashaBhuktiAntara: string;
  gocharNote: string;
  notes: string;
}> = [
  // Marriage
  {
    category: 'Marriage',
    subMatter: 'Marriage — Arranged',
    promiseHouses: '2, 7, 11',
    denialHouses: '1, 6, 8, 10, 12',
    dashaBhuktiAntara: 'Running Dasha, Bhukti and Antara lords should each be significators of 2, 7 or 11 (star lord/sub lord connection to these houses)',
    gocharNote: 'Transit of Jupiter (for women) / Venus (for men) over the 7th house or 7th lord during a favourable period supports timing; Saturn/Rahu-Ketu transit over the 7th house often coincides with delay',
    notes: '7th Cuspal Sub Lord (CSL) is the primary judge — its house/star/sub connections decide promise vs denial',
  },
  {
    category: 'Marriage',
    subMatter: 'Marriage — Love',
    promiseHouses: '5, 7, 11',
    denialHouses: '1, 6, 8, 10, 12',
    dashaBhuktiAntara: 'Same 5/7/11 pattern should repeat through Dasha-Bhukti-Antara for the love-affair-to-marriage period',
    gocharNote: 'Same as arranged marriage; additionally transit of Venus over the 5th/7th house often marks the romantic-attachment phase',
    notes: '5th house (romance/affairs) added to the base 7/11 combination distinguishes love marriage from arranged',
  },
  {
    category: 'Marriage',
    subMatter: 'Marriage — Inter-caste / Inter-religion',
    promiseHouses: '7, 11 with the 9th house/lord involved unconventionally (often via Rahu or a mutual exchange)',
    denialHouses: '1, 6, 8, 10, 12',
    dashaBhuktiAntara: '7/11 pattern present, with 9th-house (dharma/customs/caste) significators mixed with Rahu/foreign-natured planets in the same period',
    gocharNote: 'Transit of Rahu over the 7th/9th house or their lords is often noted alongside the marriage-timing transits',
    notes: '9th house traditionally signifies religion/caste/customs — its unconventional involvement (via Rahu, or a planet not naturally connected to the native\'s own 9th) is the classic inter-caste/inter-religion marker',
  },
  // Life Span
  {
    category: 'Life Span',
    subMatter: 'Longevity — Long Life',
    promiseHouses: '3, 6, 8, 11 (via 8th Cuspal Sub Lord)',
    denialHouses: '2, 7 combined with 6, 8, 12 (maraka combination)',
    dashaBhuktiAntara: 'Long, healthy periods run under lords who are significators of 3, 6, 8, 11; a period ruled by a strong 2/7 + 6/8/12 maraka combination marks a critical/terminal period',
    gocharNote: 'Transit of Saturn and/or Jupiter over the 8th house/8th lord, together with Ashtakavarga weakness, is used to time critical periods',
    notes: '8th Cuspal Sub Lord is the primary significator for span-of-life judgment in KP',
  },
  // Health & Disease
  {
    category: 'Health & Disease',
    subMatter: 'Health — Illness / Disease',
    promiseHouses: '1, 5, 11 (good health — no affliction)',
    denialHouses: '6, 8, 12 (acute illness via 6th, chronic/serious via 8th, hospitalisation via 12th)',
    dashaBhuktiAntara: 'Periods ruled by significators of 6/8/12 tend to bring illness; periods ruled by significators of 1/5/11 bring recovery/good health',
    gocharNote: 'Transit of Saturn, Mars or Rahu-Ketu over the 6th/8th house or the Ascendant lord often triggers the illness event; benefic transit over 1st/11th supports recovery',
    notes: 'Match the specific disease to the afflicted house\'s body-part signification (6th = intestines/general illness, 8th = chronic/surgery, 12th = hospitalisation/left eye, etc.) per standard body-house mapping',
  },
  // Wealth & Finance
  {
    category: 'Wealth & Finance',
    subMatter: 'Wealth — Gain / Accumulation',
    promiseHouses: '2, 6, 11',
    denialHouses: '1, 5, 8, 12',
    dashaBhuktiAntara: '2/6/11 significator periods bring wealth gain; 1/5/8/12 significator periods bring financial loss/expenditure',
    gocharNote: 'Jupiter transit over the 2nd/11th house or lord signals gain; Saturn/Rahu transit over the 2nd/12th signals expenditure or loss',
    notes: '6th here represents money recovered from others (debts collected), not disease — context distinguishes the two',
  },
  // Job / Service
  {
    category: 'Job / Service',
    subMatter: 'Job — General Promise',
    promiseHouses: '2, 6, 10, 11',
    denialHouses: '5, 8, 9, 12 (or 10th CSL connected to 6, 8, 12 for termination)',
    dashaBhuktiAntara: 'New job / promotion periods run under 2/6/10/11 significator lords; job loss/termination periods run under 5/8/9/12 or 6-8-12 combination lords',
    gocharNote: 'Transit of Saturn (karaka for service) or Sun (authority) over the 10th house/lord, alongside a favourable period, times the actual joining/promotion',
    notes: '10th house = profession/status, 6th = service/employer/daily duties, 2nd = income, 11th = gains — all four together is the classic service combination',
  },
  {
    category: 'Job / Service',
    subMatter: 'Job — Government Service',
    promiseHouses: '2, 6, 10, 11 with Sun and/or Saturn strong as significators',
    denialHouses: '5, 8, 9, 12',
    dashaBhuktiAntara: 'Same base pattern, with Sun/Saturn periods favoured for government appointment',
    gocharNote: 'Transit of Sun/Saturn over the 10th house or lord around exam/interview/appointment dates',
    notes: 'Sun = authority/government, Saturn = discipline/public service — their emphasis differentiates govt from private',
  },
  {
    category: 'Job / Service',
    subMatter: 'Job — Private / MNC',
    promiseHouses: '2, 6, 10, 11 with Mercury and/or Moon prominent',
    denialHouses: '5, 8, 9, 12',
    dashaBhuktiAntara: 'Same base pattern, Mercury/Moon periods favoured',
    gocharNote: 'Transit of Mercury over the 10th/11th house around interview/offer dates',
    notes: 'Mercury = commerce/private trade/communication-driven roles',
  },
  {
    category: 'Job / Service',
    subMatter: 'Job — IT & Technical',
    promiseHouses: '2, 6, 10, 11 with Mercury and/or Rahu prominent',
    denialHouses: '5, 8, 9, 12',
    dashaBhuktiAntara: 'Same base pattern, Mercury/Rahu periods favoured',
    gocharNote: 'Transit of Mercury/Rahu over the 10th/11th house',
    notes: 'Rahu = technology/unconventional/foreign-linked work; Mercury = technical skill/analysis',
  },
  {
    category: 'Job / Service',
    subMatter: 'Job — Medical / Healthcare',
    promiseHouses: '2, 6, 10, 11 combined with 6th/8th/12th house strength (Mars/Sun prominent)',
    denialHouses: '5, 9, 12 unsupported',
    dashaBhuktiAntara: 'Same base pattern; periods of Mars/Sun/Saturn (surgery, service, discipline) favoured for medical career timing',
    gocharNote: 'Transit of Mars over the 6th/10th house around admission/appointment',
    notes: 'Medical profession relates to the houses of disease (6, 8, 12) being turned into a service career — that combination is a career signifier here, not an illness signifier',
  },
  {
    category: 'Job / Service',
    subMatter: 'Job — Teaching / Academics',
    promiseHouses: '2, 6, 10, 11 combined with 5th/9th house strength (Jupiter/Mercury prominent)',
    denialHouses: '5, 8, 9, 12 (unsupported)',
    dashaBhuktiAntara: 'Same base pattern; Jupiter/Mercury periods favoured',
    gocharNote: 'Transit of Jupiter over the 9th/10th house around joining',
    notes: '5th = teaching/knowledge transfer, 9th = higher learning/guru — their support marks an academics-oriented career',
  },
  {
    category: 'Job / Service',
    subMatter: 'Job — Banking & Finance',
    promiseHouses: '2, 6, 10, 11 with 2nd/11th house strength (Jupiter/Venus/Mercury prominent)',
    denialHouses: '5, 8, 9, 12',
    dashaBhuktiAntara: 'Same base pattern; Jupiter/Venus/Mercury periods favoured',
    gocharNote: 'Transit of Jupiter over the 2nd/11th house around appointment',
    notes: '2nd/11th (wealth houses) reinforcing the base service combination points to finance-sector roles',
  },
  {
    category: 'Job / Service',
    subMatter: 'Job — Defense / Police / Government Admin',
    promiseHouses: '2, 6, 10, 11 with Mars and/or Saturn/Sun prominent',
    denialHouses: '5, 8, 9, 12',
    dashaBhuktiAntara: 'Same base pattern; Mars (courage/action) or Saturn/Sun (discipline/authority) periods favoured',
    gocharNote: 'Transit of Mars/Saturn over the 10th house around selection/training dates',
    notes: 'Mars = courage/combat roles, Saturn = discipline/service, Sun = government authority',
  },
  // Business
  {
    category: 'Business',
    subMatter: 'Business — General Promise',
    promiseHouses: '3, 7, 10, 11',
    denialHouses: '5, 8, 12',
    dashaBhuktiAntara: 'Business start/expansion periods run under 3/7/10/11 significator lords; loss periods run under 5/8/12 significator lords',
    gocharNote: 'Transit of Jupiter/Mercury over the 7th/11th house or lord supports launch/expansion timing',
    notes: '3rd = self-effort/initiative, 7th = trade/partnership/dealings with the public, 10th = profession, 11th = gains — the classic business combination',
  },
  {
    category: 'Business',
    subMatter: 'Business — Trading / Retail',
    promiseHouses: '3, 7, 10, 11 with Mercury prominent',
    denialHouses: '5, 8, 12',
    dashaBhuktiAntara: 'Same base pattern; Mercury periods favoured',
    gocharNote: 'Transit of Mercury over the 7th/11th house',
    notes: 'Mercury = trade/communication/commerce',
  },
  {
    category: 'Business',
    subMatter: 'Business — Manufacturing / Industry',
    promiseHouses: '3, 7, 10, 11 with Mars/Saturn prominent',
    denialHouses: '5, 8, 12',
    dashaBhuktiAntara: 'Same base pattern; Mars/Saturn periods favoured',
    gocharNote: 'Transit of Mars/Saturn over the 10th house',
    notes: 'Mars = manufacturing/engineering/production, Saturn = heavy industry/labour-oriented work',
  },
  {
    category: 'Business',
    subMatter: 'Business — Real Estate',
    promiseHouses: '3, 4, 7, 10, 11 with Mars prominent',
    denialHouses: '5, 8, 12',
    dashaBhuktiAntara: 'Same base pattern with the 4th (property) added; Mars periods favoured',
    gocharNote: 'Transit of Mars/Saturn over the 4th/11th house',
    notes: '4th house (property/land) added to the base combination for property-related business',
  },
  {
    category: 'Business',
    subMatter: 'Business — Import-Export / Foreign Trade',
    promiseHouses: '3, 7, 10, 11, 12 with Rahu prominent',
    denialHouses: '5, 8',
    dashaBhuktiAntara: 'Same base pattern with the 12th (foreign lands) added; Rahu periods favoured',
    gocharNote: 'Transit of Rahu over the 7th/12th house',
    notes: '12th house (foreign land/distant dealings) added; Rahu signifies foreign/unconventional trade',
  },
  {
    category: 'Business',
    subMatter: 'Business — Partnership Business',
    promiseHouses: '3, 7, 10, 11 with the 7th house (partner) especially strong and unafflicted',
    denialHouses: '5, 6, 8, 12 (partner disputes)',
    dashaBhuktiAntara: 'Same base pattern; check both partners\' significators for the same period alignment',
    gocharNote: 'Transit affecting the 7th house/lord affects the partnership\'s stability directly',
    notes: '7th house here doubles as both trade and partner — its affliction (6/8/12) signals partner disputes even if the business itself is fine',
  },
  {
    category: 'Business',
    subMatter: 'Business — Online / E-commerce',
    promiseHouses: '3, 7, 10, 11 with Mercury/Rahu prominent',
    denialHouses: '5, 8, 12',
    dashaBhuktiAntara: 'Same base pattern; Mercury/Rahu periods favoured',
    gocharNote: 'Transit of Mercury/Rahu over the 7th/11th house',
    notes: 'Rahu = technology/unconventional platforms, Mercury = commerce/communication',
  },
  {
    category: 'Business',
    subMatter: 'Business — Consultancy / Professional Services',
    promiseHouses: '3, 7, 10, 11 with Jupiter/Mercury prominent',
    denialHouses: '5, 8, 12',
    dashaBhuktiAntara: 'Same base pattern; Jupiter/Mercury periods favoured',
    gocharNote: 'Transit of Jupiter over the 9th/11th house',
    notes: 'Jupiter = advisory/knowledge-based professional services',
  },
  {
    category: 'Business',
    subMatter: 'Business — Agriculture-based',
    promiseHouses: '3, 4, 7, 10, 11 with Saturn/Venus prominent',
    denialHouses: '5, 8, 12',
    dashaBhuktiAntara: 'Same base pattern with the 4th (land) added; Saturn/Venus periods favoured',
    gocharNote: 'Transit of Saturn/Venus over the 4th/10th house',
    notes: '4th house (land) added; Saturn = labour/land-based work, Venus = crop/produce value',
  },
  // Education
  {
    category: 'Education',
    subMatter: 'Education — Primary',
    promiseHouses: '4, 5, 11',
    denialHouses: '3, 8, 12',
    dashaBhuktiAntara: '4/5/11 significator periods bring steady early schooling progress; 3/8/12 significator periods bring interruption',
    gocharNote: 'Transit of Jupiter (karaka for education) over the 4th/5th house supports admission/progress timing',
    notes: '4th = basic schooling/foundation, 5th = learning capacity/intelligence, 11th = fulfilment (passing/completion)',
  },
  {
    category: 'Education',
    subMatter: 'Education — Secondary (10 + 2)',
    promiseHouses: '4, 5, 9, 11',
    denialHouses: '3, 8, 12',
    dashaBhuktiAntara: 'Same pattern with the 9th (higher-learning direction) added',
    gocharNote: 'Transit of Jupiter over the 5th/9th house around board-exam periods',
    notes: '9th house begins to matter here as the bridge toward higher education',
  },
  {
    category: 'Education',
    subMatter: 'Education — Higher (Graduation / Post-Graduation)',
    promiseHouses: '4, 5, 9, 11 (via 9th Cuspal Sub Lord)',
    denialHouses: '3, 8, 12',
    dashaBhuktiAntara: '9th CSL and running Dasha-Bhukti-Antara lords should be significators of 4/5/9/11 for admission/degree completion',
    gocharNote: 'Transit of Jupiter over the 9th/11th house or lord around admission/result dates',
    notes: '9th Cuspal Sub Lord is the primary judge for higher education, the same role the 7th CSL plays for marriage',
  },
  {
    category: 'Education',
    subMatter: 'Education — PhD / Doctorate / Research',
    promiseHouses: '6, 9, 11 (deep/prolonged study) with the 3rd (self-effort) supporting',
    denialHouses: '3, 8, 12 (unsupported)',
    dashaBhuktiAntara: '9th CSL connected to 6/9/11 with the running period lords also significators of the same — 6th here represents sustained, service-like research effort, not illness',
    gocharNote: 'Transit of Jupiter/Saturn (persistence) over the 9th house around milestones (proposal, viva, publication)',
    notes: '6th house is reused here in its "sustained daily effort/service" sense — always disambiguate from its disease meaning by context',
  },
  // Education Location
  {
    category: 'Education Location',
    subMatter: 'Education — From Home',
    promiseHouses: '4 (strong, unafflicted by the 12th)',
    denialHouses: '12 prominent over the 4th',
    dashaBhuktiAntara: 'Period lords significators of 4 without 12th involvement',
    gocharNote: 'Not typically transit-timed — mainly a natal/dasha placement judgment',
    notes: 'Absence of 12th-house (distant residence) involvement keeps studies rooted at home',
  },
  {
    category: 'Education Location',
    subMatter: 'Education — Hostel / Away (same country)',
    promiseHouses: '3, 4, 9, 11 (short/medium-distance movement)',
    denialHouses: '12 dominant without 3/9 support',
    dashaBhuktiAntara: 'Period lords significators of 3/9/11 alongside the 4th',
    gocharNote: 'Transit of Moon/Mercury (short travel) around the move date',
    notes: '3rd house (short journeys) added, distinguishing this from full abroad relocation',
  },
  {
    category: 'Education Location',
    subMatter: 'Education — Abroad / Foreign',
    promiseHouses: '3, 9, 12 (foreign land + higher study + travel)',
    denialHouses: '4 pulling back home instead of the 12th',
    dashaBhuktiAntara: '9th/4th CSL connected to 3/9/12 through Dasha-Bhukti-Antara for the departure period',
    gocharNote: 'Transit of Rahu/Jupiter over the 9th/12th house around visa/departure dates',
    notes: '12th house (foreign land) is the key differentiator versus the other two location categories',
  },
  // Children / Progeny
  {
    category: 'Children / Progeny',
    subMatter: 'Children — Progeny / Childbirth',
    promiseHouses: '2, 5, 11',
    denialHouses: '1, 4, 10, 12 — chronic denial via 5th CSL connected to 4, 8, 12 without 2/5/11 support',
    dashaBhuktiAntara: '5th CSL and running Dasha-Bhukti-Antara lords should be significators of 2/5/11 for conception/childbirth timing',
    gocharNote: 'Transit of Jupiter (karaka for children) over the 5th house/lord during a favourable period',
    notes: '5th Cuspal Sub Lord is the primary judge, mirroring the 7th CSL for marriage and 9th CSL for higher education',
  },
  // Property & Vehicle
  {
    category: 'Property & Vehicle',
    subMatter: 'Property — Land / House Purchase',
    promiseHouses: '4, 11, 12 (12th here = investment/expenditure enabling acquisition)',
    denialHouses: '8, 12 unsupported (obstruction/loss instead of acquisition)',
    dashaBhuktiAntara: '4th CSL connected to 4/11/12 through the running period for acquisition timing',
    gocharNote: 'Transit of Mars/Saturn (karakas for property) over the 4th house/lord',
    notes: '4th Cuspal Sub Lord is the primary judge for property matters',
  },
  {
    category: 'Property & Vehicle',
    subMatter: 'Property — Vehicle Purchase',
    promiseHouses: '4, 11 with the 4th CSL well-placed',
    denialHouses: '8, 12 unsupported',
    dashaBhuktiAntara: 'Same base pattern as property, generally a lighter/faster-manifesting version',
    gocharNote: 'Transit of Mars/Venus over the 4th house/lord',
    notes: 'Same 4th-house family as property but typically confirmed faster and needs less support',
  },
  // Foreign Travel & Settlement
  {
    category: 'Foreign Travel & Settlement',
    subMatter: 'Foreign Travel / Settlement Abroad',
    promiseHouses: '3, 9, 12',
    denialHouses: '2, 4, 8, 12 unsupported (obstruction rather than 3/9/12 promise)',
    dashaBhuktiAntara: '12th CSL connected to 3/9/12 through Dasha-Bhukti-Antara for the travel/settlement period',
    gocharNote: 'Transit of Rahu/Jupiter over the 9th/12th house around visa/departure dates',
    notes: '12th Cuspal Sub Lord is the primary judge for foreign travel/settlement matters',
  },
];

function authorize(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!isSuperAdmin(decoded)) {
    return { error: NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 }) };
  }
  return { decoded };
}

/**
 * POST /api/admin/crm/kp-astro/rule-book/seed-draft
 * One-time, idempotent seed of a standard-KP starting draft — only inserts
 * if the Rule Book is currently completely empty, so it never overwrites or
 * duplicates anything the astrologer has already entered/edited.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = authorize(request);
    if (auth.error) return auth.error;

    await connectDB();
    const KpRuleBookEntry = getKpRuleBookEntry();
    const existingCount = await (KpRuleBookEntry as any).countDocuments({});
    if (existingCount > 0) {
      return NextResponse.json({ success: true, seeded: false, message: 'Rule Book already has entries — draft not applied' });
    }

    const userId = getViewerUserId(auth.decoded);
    const docs = DRAFT_ENTRIES.map((entry, index) => ({
      ...entry,
      order: index,
      isDraft: true,
      createdByUserId: userId,
    }));
    const created = await (KpRuleBookEntry as any).insertMany(docs);
    return NextResponse.json({ success: true, seeded: true, data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to seed rule book draft';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
