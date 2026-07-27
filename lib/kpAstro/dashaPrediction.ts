// Cross-references the Rule Book (promise/denial house combinations per
// life-matter) against a chart's Dasha tree, so the astrologer can ask "what
// is likely during this Mahadasha / this Antardasha / this Pratyantardasha"
// instead of picking one matter and searching for it (that direction is
// already covered by eventTiming.ts).
//
// Two-step KP method, per the astrologer's own framing:
//   1. Green-signal check (natal): is the matter promised at all in this
//      chart? Judged from the matter's primary house's Cuspal Sub Lord (CSL)
//      -- if the CSL's own significators connect more to the promise houses
//      than the denial houses, the matter is promised; a birth chart that
//      never promises a matter won't manifest it no matter how favourable
//      the dasha looks.
//   2. Timing (dasha): for promised matters only, do the running Dasha /
//      Bhukti / Antara (Maha/Antar/Pratyantar) lords also signify the same
//      promise houses? Each level that does adds to the confidence count.
//
// Exact-date narrowing (transit/gochar) is intentionally NOT duplicated here
// -- once a promising window is found, feed its matter's promiseHouses and
// date range into the existing /event-timing endpoint (eventTiming.ts),
// which already does the day/hour-level transit refinement.

import { computeFourStepSignificators, type SignificatorHouse, type SignificatorPlanet } from './significators';
import { functionalNature, type PlanetNature } from './planetNature';

// Age-appropriateness gate: a matter can be house-promised AND dasha-timed
// and still not be able to fructify in a given period if the native simply
// isn't the right age for it yet (or any more) -- e.g. "Primary Education"
// can't happen at age 40, "Job" can't happen at age 8. Astrologer-specified
// ranges (verbatim): primary/secondary schooling up to age 15, marriage
// 18-40, live-in/premarital ("affair") 13 through old age, job 18-65,
// business 15 through old age. Everything else uses a reasonable default
// for its category -- these are approximations the astrologer can treat as
// a first-pass filter, not a hard KP rule.
const DEFAULT_AGE_RANGE = { minAge: 0, maxAge: 120 };

interface AgeRange { minAge: number; maxAge: number; }

const CATEGORY_AGE_RANGE: Record<string, AgeRange> = {
  'Marriage': { minAge: 18, maxAge: 40 },
  'Life Span': DEFAULT_AGE_RANGE,
  'Health & Disease': DEFAULT_AGE_RANGE,
  'Wealth & Finance': { minAge: 15, maxAge: 100 },
  'Job / Service': { minAge: 18, maxAge: 65 },
  'Business': { minAge: 15, maxAge: 120 },
  'Litigation & Disputes': { minAge: 18, maxAge: 120 },
  'Accidents': DEFAULT_AGE_RANGE,
  'Education': { minAge: 3, maxAge: 15 }, // overridden per sub-matter below for Higher/PhD
  'Education Location': { minAge: 5, maxAge: 30 },
  'Children / Progeny': { minAge: 18, maxAge: 45 },
  'Property & Vehicle': { minAge: 18, maxAge: 80 },
  'Travel': { minAge: 5, maxAge: 100 },
  'Family Relationships': DEFAULT_AGE_RANGE,
  'Reputation & Public Life': { minAge: 20, maxAge: 80 },
  'Second Marriage & Widowhood': { minAge: 20, maxAge: 100 },
  'Retirement': { minAge: 45, maxAge: 75 },
  'Adoption': { minAge: 21, maxAge: 55 },
  'Loans & Borrowing': { minAge: 18, maxAge: 70 },
  'Bankruptcy': { minAge: 18, maxAge: 75 },
};

// Sub-matter overrides where a single category-wide range would be wrong --
// Education spans ages 3 to 40 depending on which stage, and one Marriage
// row is explicitly the "affair" case the astrologer called out separately.
const SUBMATTER_AGE_RANGE: Array<{ match: (subMatter: string) => boolean; range: AgeRange }> = [
  { match: (s) => s.includes('Higher (Graduation'), range: { minAge: 15, maxAge: 25 } },
  { match: (s) => s.includes('PhD') || s.includes('Doctorate'), range: { minAge: 20, maxAge: 40 } },
  { match: (s) => s.includes('Live-in Partner') || s.includes('Premarital'), range: { minAge: 13, maxAge: 100 } },
];

function ageRangeForMatter(category: string, subMatter: string): AgeRange {
  const override = SUBMATTER_AGE_RANGE.find((o) => o.match(subMatter));
  if (override) return override.range;
  return CATEGORY_AGE_RANGE[category] || DEFAULT_AGE_RANGE;
}

function ageAt(dob: Date, atDate: Date): number {
  return (atDate.getTime() - dob.getTime()) / (365.2425 * 86400000);
}

export interface AgeContext {
  dob: Date;
  periodStart: Date;
  periodEnd: Date;
}

// Does the native's age DURING this period (age at its start through age at
// its end) overlap the matter's age-appropriate range at all? Overlap (not
// containment) so a period that starts just before and ends just after a
// boundary still counts -- e.g. a Bhukti spanning age 17-19 still overlaps
// marriage's 18-40 window.
function isAgeAppropriate(ageContext: AgeContext | undefined, category: string, subMatter: string): boolean {
  if (!ageContext) return true; // no DOB on this chart -- don't filter, just skip the check
  const { minAge, maxAge } = ageRangeForMatter(category, subMatter);
  const ageStart = ageAt(ageContext.dob, ageContext.periodStart);
  const ageEnd = ageAt(ageContext.dob, ageContext.periodEnd);
  return ageEnd >= minAge && ageStart <= maxAge;
}

export interface RuleBookMatterInput {
  _id: string;
  category: string;
  subMatter: string;
  primaryHouse?: number | null;
  promiseHouses: string;
  denialHouses: string;
}

export interface BhavAnalysisInput {
  house: number;
  subLord?: string;
}

// Pulls every 1-12 integer out of a free-text house-combination field like
// "2, 7, 11 + fruitful (Kendra/Trikona) signs on the 7th cusp" -- the Rule
// Book stores these as prose, not structured arrays.
export function parseHouseList(text: string | undefined | null): number[] {
  if (!text) return [];
  const matches = text.match(/\b(1[0-2]|[1-9])\b/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map(Number)));
}

export type NatalVerdict = 'promised' | 'denied' | 'mixed' | 'unclear' | 'no-csl';

export interface NatalPromiseCheck {
  verdict: NatalVerdict;
  csl?: string;
  signifiedHouses: number[];
  promiseMatches: number[];
  denialMatches: number[];
}

// The natal "green signal" check for one matter, using the matter's
// primaryHouse's CSL. Uses the same 4-step significator method as the dasha
// lords below (rather than the simpler cuspSubLordSignification helper) so
// natal-promise and dasha-timing are judged by one consistent method.
export function checkNatalPromise(
  houses: SignificatorHouse[],
  planets: SignificatorPlanet[],
  bhavAnalysis: BhavAnalysisInput[],
  primaryHouse: number | null | undefined,
  promiseHouses: number[],
  denialHouses: number[]
): NatalPromiseCheck {
  if (!primaryHouse) {
    return { verdict: 'unclear', signifiedHouses: [], promiseMatches: [], denialMatches: [] };
  }
  const bhavRow = bhavAnalysis.find((b) => b.house === primaryHouse);
  const csl = bhavRow?.subLord || houses.find((h) => h.house === primaryHouse)?.subLord;
  if (!csl) {
    return { verdict: 'no-csl', signifiedHouses: [], promiseMatches: [], denialMatches: [] };
  }

  const sig = computeFourStepSignificators(houses, planets).find((s) => s.planet === csl);
  const signifiedHouses = sig ? Array.from(new Set([...sig.A, ...sig.B, ...sig.C, ...sig.D])) : [];

  const promiseMatches = promiseHouses.filter((h) => signifiedHouses.includes(h));
  const denialMatches = denialHouses.filter((h) => signifiedHouses.includes(h));

  let verdict: NatalVerdict;
  if (promiseMatches.length > denialMatches.length) verdict = 'promised';
  else if (denialMatches.length > promiseMatches.length) verdict = 'denied';
  else if (promiseMatches.length > 0) verdict = 'mixed';
  else verdict = 'unclear';

  return { verdict, csl, signifiedHouses, promiseMatches, denialMatches };
}

export interface ChainMatch {
  matchedCount: number;
  totalLevels: number;
  matchedPlanets: string[];
  // Functional nature (per-ascendant, i.e. which houses this planet owns in
  // THIS chart -- see planetNature.ts) of each matched planet. A benefic
  // lord supporting the promise houses is a stronger positive signal than a
  // malefic one doing the same.
  matchedPlanetNatures: Record<string, PlanetNature>;
}

// For an arbitrary running chain (e.g. [mahaLord], or [mahaLord, antarLord],
// or all the way down to Prana) -- how many of those levels' lords are
// significators of the matter's PRIMARY house specifically.
//
// Deliberately checks one house, not "any of the promise combination": a
// planet's own A/B/C/D signification set is broad (often 4-8+ houses), so
// "connects to any one of 3-5 promise houses" matches the vast majority of
// planets against the vast majority of matters -- tried this first and it
// produced ~90 of 106 matters "matching" almost every single dasha level,
// which is not a usable signal. Anchoring on the one house that already
// gates the natal check (primaryHouse) keeps dasha-timing and natal-promise
// consistent (same house, both steps) and is dramatically more selective.
export function matchChainAgainstHouse(
  houses: SignificatorHouse[],
  planets: SignificatorPlanet[],
  chainPlanets: string[],
  targetHouse: number
): ChainMatch {
  const allSig = computeFourStepSignificators(houses, planets);
  const matchedPlanets = Array.from(new Set(chainPlanets.filter((p) => {
    const sig = allSig.find((s) => s.planet === p);
    if (!sig) return false;
    const all = [...sig.A, ...sig.B, ...sig.C, ...sig.D];
    return all.includes(targetHouse);
  })));
  const matchedPlanetNatures: Record<string, PlanetNature> = {};
  for (const p of matchedPlanets) matchedPlanetNatures[p] = functionalNature(p, houses);
  return { matchedCount: matchedPlanets.length, totalLevels: chainPlanets.length, matchedPlanets, matchedPlanetNatures };
}

export type ObstructionSeverity = 'strong' | 'moderate' | 'mild';

export interface DeepestLevelDenialCheck {
  obstructed: boolean;
  planet?: string;
  planetNature?: PlanetNature;
  severity?: ObstructionSeverity;
  matchedDenialHouses: number[];
}

// Even a matter that's promised natally AND has broader Dasha/Bhukti support
// can still fail to fructify in a SPECIFIC finer sub-period if that
// sub-period's own lord is itself a strong significator of the matter's
// denial houses -- e.g. marriage is promised (7th CSL -> 2,7,11) and the
// Dasha/Bhukti both support it, but if the current Antara lord signifies
// 6, 8, 12 (the denial combination), marriage will NOT happen in that
// specific Antara even though the broader periods are favourable. Checked
// against only the deepest (most specific) currently-selected chain level,
// since that is the finest-grained "final gate" in the KP timing chain.
//
// Severity is weighted by the obstructing planet's functional nature (per
// planetNature.ts, i.e. which houses IT owns in this chart): a malefic lord
// sitting on the denial houses is a near-certain block ('strong' -- the
// astrologer's own "100% not possible" framing); a benefic lord touching the
// same denial houses is a softer caution, not a hard block ('mild'); neutral
// falls in between.
export function checkDenialAtDeepestLevel(
  houses: SignificatorHouse[],
  planets: SignificatorPlanet[],
  chainPlanets: string[],
  denialHouses: number[]
): DeepestLevelDenialCheck {
  if (chainPlanets.length === 0 || denialHouses.length === 0) {
    return { obstructed: false, matchedDenialHouses: [] };
  }
  const deepestPlanet = chainPlanets[chainPlanets.length - 1];
  const sig = computeFourStepSignificators(houses, planets).find((s) => s.planet === deepestPlanet);
  if (!sig) return { obstructed: false, matchedDenialHouses: [] };

  const all = [...sig.A, ...sig.B, ...sig.C, ...sig.D];
  const matchedDenialHouses = denialHouses.filter((h) => all.includes(h));
  if (matchedDenialHouses.length === 0) return { obstructed: false, matchedDenialHouses: [] };

  const planetNature = functionalNature(deepestPlanet, houses);
  const severity: ObstructionSeverity = planetNature === 'Malefic' ? 'strong' : planetNature === 'Benefic' ? 'mild' : 'moderate';

  return { obstructed: true, planet: deepestPlanet, planetNature, severity, matchedDenialHouses };
}

export interface ConfirmingBhukti {
  planet: string;
  startDate: string;
  endDate: string;
}

// For a Mahadasha-level match, which of its child Antardashas ALSO connect
// to the same primary house (i.e. both Dasha and Bhukti agree) -- this is
// what actually answers "which Bhukti within this Mahadasha brings it,"
// rather than leaving the astrologer to re-check every Antardasha by hand
// in the drill-down. Excludes any Antardasha that's itself a strong
// (malefic-on-denial-houses) obstruction for this matter.
export function findConfirmingBhuktis(
  houses: SignificatorHouse[],
  planets: SignificatorPlanet[],
  mahaLord: string,
  antarRows: Array<{ planet: string; startDate: string; endDate: string }>,
  primaryHouse: number,
  denialHouses: number[],
  category: string,
  subMatter: string,
  dob?: Date | null
): ConfirmingBhukti[] {
  const results: ConfirmingBhukti[] = [];
  for (const antar of antarRows) {
    const chain = matchChainAgainstHouse(houses, planets, [mahaLord, antar.planet], primaryHouse);
    if (chain.matchedCount < 2) continue;
    const denial = checkDenialAtDeepestLevel(houses, planets, [mahaLord, antar.planet], denialHouses);
    if (denial.obstructed && denial.severity === 'strong') continue;
    if (dob) {
      const ageOk = isAgeAppropriate({ dob, periodStart: new Date(antar.startDate), periodEnd: new Date(antar.endDate) }, category, subMatter);
      if (!ageOk) continue;
    }
    results.push({ planet: antar.planet, startDate: antar.startDate, endDate: antar.endDate });
  }
  return results;
}

export interface MatterMatch {
  ruleId: string;
  category: string;
  subMatter: string;
  primaryHouse?: number | null;
  promiseHouses: number[];
  denialHouses: number[];
  natal: NatalPromiseCheck;
  chain: ChainMatch;
  deepestLevelDenial: DeepestLevelDenialCheck;
  // Only populated for the Mahadasha-level overview (undefined when
  // evaluating an already-specific drilled-into chain, since at that point
  // the astrologer has already picked the Bhukti/Antara themselves).
  confirmingBhuktis?: ConfirmingBhukti[];
}

// Evaluates every Rule Book matter against one running chain, returning only
// matters where at least one chain-level lord matches. Natal check is always
// included so the caller can decide whether to hide/downgrade denied ones.
export function evaluateChainForAllMatters(
  houses: SignificatorHouse[],
  planets: SignificatorPlanet[],
  bhavAnalysis: BhavAnalysisInput[],
  rules: RuleBookMatterInput[],
  chainPlanets: string[],
  ageContext?: AgeContext
): MatterMatch[] {
  const results: MatterMatch[] = [];
  for (const rule of rules) {
    if (!rule.primaryHouse) continue; // no anchor house recorded yet -- can't judge this matter's timing
    const promiseHouses = parseHouseList(rule.promiseHouses);
    const denialHouses = parseHouseList(rule.denialHouses);
    if (promiseHouses.length === 0) continue;

    // Age gate: house-promised and dasha-timed doesn't matter if the native
    // isn't the right age for this matter during this exact period (e.g.
    // "Primary Education" can't fructify at age 40).
    if (!isAgeAppropriate(ageContext, rule.category, rule.subMatter)) continue;

    const chain = matchChainAgainstHouse(houses, planets, chainPlanets, rule.primaryHouse);
    if (chain.matchedCount === 0) continue;

    const natal = checkNatalPromise(houses, planets, bhavAnalysis, rule.primaryHouse, promiseHouses, denialHouses);
    // Not an actionable prediction if the natal chart doesn't even lean
    // toward promising it -- 'unclear' (no signal either way) and 'no-csl'
    // (CSL not recorded yet) and 'denied' are all noise in a "what will
    // happen" list; e.g. six near-identical "Pregnancy" rows all sitting at
    // 'unclear' just clutter one Bhukti's results. 'mixed' stays since it at
    // least has a real (if tied) promise signal.
    if (natal.verdict === 'unclear' || natal.verdict === 'no-csl' || natal.verdict === 'denied') continue;

    const deepestLevelDenial = checkDenialAtDeepestLevel(houses, planets, chainPlanets, denialHouses);
    // A malefic sitting on the denial houses at the deepest selected level is
    // a near-certain block (the astrologer's own "100% not possible"
    // framing) -- not worth cluttering the list with, so drop it entirely
    // rather than showing it with a warning. Moderate/mild obstruction is
    // still a caution, not a hard block, so those stay visible.
    if (deepestLevelDenial.obstructed && deepestLevelDenial.severity === 'strong') continue;

    results.push({
      ruleId: rule._id,
      category: rule.category,
      subMatter: rule.subMatter,
      primaryHouse: rule.primaryHouse,
      promiseHouses,
      denialHouses,
      natal,
      chain,
      deepestLevelDenial,
    });
  }
  // Strongest first: least-obstructed before most-obstructed (strong
  // obstruction sinks furthest), then more chain levels agreeing, then
  // natally-promised over denied/unclear.
  const obstructionRank = (d: DeepestLevelDenialCheck) =>
    !d.obstructed ? 0 : d.severity === 'mild' ? 1 : d.severity === 'moderate' ? 2 : 3;
  return results.sort((a, b) => {
    const obA = obstructionRank(a.deepestLevelDenial);
    const obB = obstructionRank(b.deepestLevelDenial);
    if (obA !== obB) return obA - obB;
    if (b.chain.matchedCount !== a.chain.matchedCount) return b.chain.matchedCount - a.chain.matchedCount;
    const rank = (v: NatalVerdict) => (v === 'promised' ? 0 : v === 'mixed' ? 1 : v === 'unclear' || v === 'no-csl' ? 2 : 3);
    return rank(a.natal.verdict) - rank(b.natal.verdict);
  });
}
