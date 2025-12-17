import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();

const SOURCE_PATH = path.join(ROOT, 'scripts', 'assets', 'speaker-source.jpg');
const OUT_DIR = path.join(ROOT, 'public', 'images', 'workshops');
const OUT_PATH = path.join(OUT_DIR, 'swar-yoga-basic.png');

// Output size chosen to fit workshop cards nicely (object-cover in a ~3:2-ish frame)
const W = 1200;
const H = 800;

function escapeXml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  // Read source image and crop the right-side speaker region using relative coordinates.
  // This is intentionally resilient to minor size changes.
  const source = sharp(SOURCE_PATH);
  const meta = await source.metadata();
  const srcW = meta.width ?? 0;
  const srcH = meta.height ?? 0;
  if (!srcW || !srcH) throw new Error('Unable to read source image dimensions');

  // The screenshot layout places the speaker in the right half.
  // Crop a square-ish region around the speaker.
  const cropSize = Math.round(Math.min(srcW, srcH) * 0.46);
  const cropLeft = Math.round(srcW * 0.54);
  const cropTop = Math.round(srcH * 0.14);

  const speakerSquare = await sharp(SOURCE_PATH)
    .extract({
      left: Math.max(0, Math.min(cropLeft, srcW - cropSize)),
      top: Math.max(0, Math.min(cropTop, srcH - cropSize)),
      width: Math.min(cropSize, srcW),
      height: Math.min(cropSize, srcH),
    })
    .resize(420, 420)
    .png()
    .toBuffer();

  // Circular mask for the speaker
  const circleMask = Buffer.from(
    `<svg width="420" height="420" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg">
      <circle cx="210" cy="210" r="210" fill="#fff"/>
    </svg>`
  );

  const speakerCircle = await sharp(speakerSquare)
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const title = 'BASIC SWAR YOGA';
  const subtitle = '3 DAYS • DAILY 1.5 HOURS';
  const focus = 'For digestion • sleep • constipation • gas issues';

  // Background + typography via SVG
  const svg = `
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7c3aed"/>
        <stop offset="1" stop-color="#ec4899"/>
      </linearGradient>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity="0.22"/>
      </filter>
    </defs>

    <!-- Base -->
    <rect width="${W}" height="${H}" fill="#f8fafc"/>

    <!-- Decorative rings (top-left) -->
    <circle cx="90" cy="80" r="82" fill="#ede9fe"/>
    <circle cx="90" cy="80" r="58" fill="#ffffff"/>

    <!-- Right-side soft circle behind speaker -->
    <circle cx="980" cy="310" r="260" fill="#ede9fe"/>

    <!-- Brand -->
    <text x="720" y="86" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="44" font-weight="800" fill="#ec4899">Swar Yoga</text>

    <!-- Live label -->
    <circle cx="90" cy="150" r="6" fill="#ef4444"/>
    <text x="110" y="156" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="18" font-weight="700" fill="#111827">LIVE WORKSHOP</text>

    <!-- Title -->
    <text x="70" y="240" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="64" font-weight="900" fill="#0f172a">${escapeXml(title)}</text>
    <text x="70" y="300" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="54" font-weight="900" fill="#0f172a">WORKSHOP</text>

    <!-- Subtitle pill -->
    <rect x="70" y="330" rx="18" ry="18" width="520" height="50" fill="url(#g)"/>
    <text x="92" y="364" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="22" font-weight="800" fill="#ffffff">${escapeXml(subtitle)}</text>

    <!-- Focus line -->
    <text x="70" y="420" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="22" font-weight="700" fill="#6b21a8">${escapeXml(focus)}</text>

    <!-- Bottom ribbon -->
    <rect x="0" y="590" width="${W}" height="210" fill="#7c3aed"/>
    <rect x="0" y="590" width="${W}" height="210" fill="url(#g)" opacity="0.35"/>

    <!-- Bottom highlights -->
    <text x="70" y="660" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="22" font-weight="800" fill="#ffffff">✓ Improve digestion</text>
    <text x="70" y="700" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="22" font-weight="800" fill="#ffffff">✓ Better sleep</text>
    <text x="70" y="740" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="22" font-weight="800" fill="#ffffff">✓ Relief in constipation &amp; gas</text>

    <!-- CTA style box (non-clickable in image, for thumbnail look) -->
    <g filter="url(#shadow)">
      <rect x="760" y="650" rx="14" ry="14" width="360" height="68" fill="#ffffff"/>
    </g>
    <text x="852" y="694" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="26" font-weight="900" fill="#111827">Register Now</text>
  </svg>`;

  const base = sharp({ create: { width: W, height: H, channels: 4, background: { r: 248, g: 250, b: 252, alpha: 1 } } })
    .composite([
      { input: Buffer.from(svg), top: 0, left: 0 },
      // Speaker circle placed on the right
      { input: speakerCircle, top: 140, left: 820 },
    ])
    .png();

  await base.toFile(OUT_PATH);

  // eslint-disable-next-line no-console
  console.log(`✅ Generated: ${path.relative(ROOT, OUT_PATH)}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
