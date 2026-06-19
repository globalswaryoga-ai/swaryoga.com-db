'use client';

// Shared North/South Indian style Kundali (birth chart) visual, used
// everywhere a chart needs to be shown (data entry preview, astrologer
// workspace, final prediction, PDF export). Pure presentational — takes
// already-computed house/planet signs, draws nothing itself astrologically.
//
// North Indian style: house POSITIONS are fixed (house 1 always the top
// kite), signs rotate into place based on the ascendant. Houses increase
// counter-clockwise from the top (standard convention).
//
// South Indian style: sign POSITIONS are fixed in a 4x4 ring (minus the
// center 2x2), starting Pisces/Aries/Taurus/Gemini across the top row and
// running clockwise — the most common published convention. The ascendant
// is marked in whichever fixed cell matches its sign; house numbers for
// every other sign follow from there.

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const PLANET_ABBR: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju',
  Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

export interface KundaliChartProps {
  chartStyle: 'north' | 'south';
  ascendantSign: string;
  houses?: Array<{ house: number; sign?: string }>;
  planets?: Array<{ planet: string; sign?: string; house?: number }>;
  size?: number;
  displayMode?: 'planet' | 'bhav';
}

// North Indian chart polygons for a 400x400 viewBox, house 1 = top kite,
// proceeding counter-clockwise (2,3 in the top-left corner triangle, 4 =
// left kite, 5,6 bottom-left corner, 7 = bottom kite, 8,9 bottom-right
// corner, 10 = right kite, 11,12 top-right corner).
const NORTH_POLYGONS: Record<number, string> = {
  1: '200,0 300,100 200,200 100,100',
  2: '0,0 200,0 100,100',
  3: '0,0 100,100 0,200',
  4: '0,200 100,100 200,200 100,300',
  5: '0,200 100,300 0,400',
  6: '0,400 100,300 200,400',
  7: '200,400 100,300 200,200 300,300',
  8: '200,400 300,300 400,400',
  9: '400,400 300,300 400,200',
  10: '400,200 300,300 200,200 300,100',
  11: '400,200 300,100 400,0',
  12: '400,0 300,100 200,0',
};

// Centroid label position for each North house polygon (hand-placed inside
// each shape, not a strict geometric centroid, to keep labels readable).
const NORTH_LABEL_POS: Record<number, [number, number]> = {
  1: [200, 80], 2: [110, 40], 3: [40, 110], 4: [120, 200], 5: [40, 290],
  6: [110, 360], 7: [200, 320], 8: [290, 360], 9: [360, 290], 10: [280, 200],
  11: [360, 110], 12: [290, 40],
};

// South Indian fixed 4x4 ring layout (row, col) -> sign, going clockwise
// from top-left: Pisces, Aries, Taurus, Gemini / Cancer / Leo / Sagittarius,
// Scorpio, Libra, Virgo / Capricorn / Aquarius.
const SOUTH_GRID: Array<{ row: number; col: number; sign: string }> = [
  { row: 0, col: 0, sign: 'Pisces' }, { row: 0, col: 1, sign: 'Aries' }, { row: 0, col: 2, sign: 'Taurus' }, { row: 0, col: 3, sign: 'Gemini' },
  { row: 1, col: 0, sign: 'Aquarius' }, { row: 1, col: 3, sign: 'Cancer' },
  { row: 2, col: 0, sign: 'Capricorn' }, { row: 2, col: 3, sign: 'Leo' },
  { row: 3, col: 0, sign: 'Sagittarius' }, { row: 3, col: 1, sign: 'Scorpio' }, { row: 3, col: 2, sign: 'Libra' }, { row: 3, col: 3, sign: 'Virgo' },
];

export default function KundaliChart({ chartStyle, ascendantSign, houses = [], planets = [], size = 360, displayMode = 'planet' }: KundaliChartProps) {
  const ascIndex = ZODIAC_SIGNS.indexOf(ascendantSign);

  // sign -> house number, derived from the ascendant (house N's sign is the
  // (ascIndex + N - 1)th sign) when the caller didn't already supply houses.
  const signToHouse = new Map<string, number>();
  if (ascIndex !== -1) {
    for (let h = 1; h <= 12; h++) {
      signToHouse.set(ZODIAC_SIGNS[(ascIndex + h - 1) % 12], h);
    }
  }
  for (const h of houses) {
    if (h.sign) signToHouse.set(h.sign, h.house);
  }

  const planetsByHouse = new Map<number, string[]>();
  for (const p of planets) {
    const house = p.house ?? (p.sign ? signToHouse.get(p.sign) : undefined);
    if (!house) continue;
    const abbr = PLANET_ABBR[p.planet] || p.planet.slice(0, 2);
    planetsByHouse.set(house, [...(planetsByHouse.get(house) || []), abbr]);
  }

  if (chartStyle === 'south') {
    const cell = size / 4;
    return (
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="bg-white rounded-lg">
        <rect x={0} y={0} width={size} height={size} fill="none" stroke="#374151" strokeWidth={2} />
        {SOUTH_GRID.map(({ row, col, sign }) => {
          const house = signToHouse.get(sign);
          const isAsc = sign === ascendantSign;
          const planetLabels = house ? planetsByHouse.get(house) || [] : [];
          return (
            <g key={sign}>
              <rect x={col * cell} y={row * cell} width={cell} height={cell} fill={isAsc ? '#ede9fe' : 'white'} stroke="#9ca3af" strokeWidth={1} />
              <text x={col * cell + 6} y={row * cell + 16} fontSize={11} fill="#6b7280">{sign.slice(0, 3)}{house ? ` (${house})` : ''}</text>
              {isAsc && <text x={col * cell + cell - 18} y={row * cell + 16} fontSize={11} fontWeight="bold" fill="#7c3aed">Asc</text>}
              <text x={col * cell + cell / 2} y={row * cell + cell / 2 + 8} fontSize={displayMode === 'bhav' ? 16 : 13} fontWeight="600" fill="#111827" textAnchor="middle">
                {displayMode === 'bhav' ? (house ? `Bhav ${house}` : '') : planetLabels.join(' ')}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // North Indian
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} className="bg-white rounded-lg">
      {Object.entries(NORTH_POLYGONS).map(([houseStr, points]) => {
        const house = Number(houseStr);
        const baseIndex = ascIndex !== -1 ? ascIndex : 0;
        const sign = ZODIAC_SIGNS[(baseIndex + house - 1) % 12];
        const [lx, ly] = NORTH_LABEL_POS[house];
        const planetLabels = planetsByHouse.get(house) || [];
        return (
          <g key={house}>
            <polygon points={points} fill={house === 1 ? '#ede9fe' : 'white'} stroke="none" />
            <text x={lx} y={ly - 10} fontSize={11} fill="#6b7280" textAnchor="middle">{sign.slice(0, 3)}</text>
            <text x={lx} y={ly + 14} fontSize={displayMode === 'bhav' ? 16 : 13} fontWeight="600" fill="#111827" textAnchor="middle">
              {displayMode === 'bhav' ? house : planetLabels.join(' ')}
            </text>
          </g>
        );
      })}
      <rect x={0} y={0} width={400} height={400} fill="none" stroke="#374151" strokeWidth={2.5} />
      <line x1={0} y1={0} x2={400} y2={400} stroke="#374151" strokeWidth={1.75} />
      <line x1={400} y1={0} x2={0} y2={400} stroke="#374151" strokeWidth={1.75} />
      <line x1={200} y1={0} x2={400} y2={200} stroke="#374151" strokeWidth={1.75} />
      <line x1={400} y1={200} x2={200} y2={400} stroke="#374151" strokeWidth={1.75} />
      <line x1={200} y1={400} x2={0} y2={200} stroke="#374151" strokeWidth={1.75} />
      <line x1={0} y1={200} x2={200} y2={0} stroke="#374151" strokeWidth={1.75} />
    </svg>
  );
}
