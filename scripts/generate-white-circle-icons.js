const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generate() {
  const rootDir = path.resolve(__dirname, '..');
  const srcLogo = path.join(rootDir, 'public/logo.png');

  console.log('Loading source logo:', srcLogo);
  // Source is 1024x1024. The green emblem is circle centered at cx=516, cy=516 with radius ~438.
  // First, extract the green emblem with transparent background outside its circular boundary.
  const cx = 516;
  const cy = 516;
  const radius = 438;
  const emblemSize = radius * 2; // 876

  // Cut square bounding box around emblem
  const croppedRaw = await sharp(srcLogo)
    .extract({ left: cx - radius, top: cy - radius, width: emblemSize, height: emblemSize })
    .toBuffer();

  // Create a circular SVG mask for the emblem so any white outside corners become transparent
  const maskSvg = Buffer.from(`
    <svg width="${emblemSize}" height="${emblemSize}">
      <circle cx="${radius}" cy="${radius}" r="${radius}" fill="white" />
    </svg>
  `);

  const greenEmblemBuffer = await sharp(croppedRaw)
    .ensureAlpha()
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();

  console.log('Extracted circular green emblem.');

  // Helper to create a round launcher icon:
  // - canvas: size x size (transparent)
  // - background: crisp antialiased white circle of diameter = size
  // - foreground: green emblem scaled to (emblemRatio * size) centered
  async function createRoundIcon(size, emblemRatio = 0.83) {
    const emblemPx = Math.round(size * emblemRatio);
    const offset = Math.round((size - emblemPx) / 2);
    const r = size / 2;

    const resizedEmblem = await sharp(greenEmblemBuffer)
      .resize(emblemPx, emblemPx, { fit: 'contain', kernel: 'lanczos3' })
      .toBuffer();

    // White circle SVG background
    const whiteCircleSvg = Buffer.from(`
      <svg width="${size}" height="${size}">
        <circle cx="${r}" cy="${r}" r="${r}" fill="#FFFFFF" />
      </svg>
    `);

    // Combine white circle + emblem
    const icon = await sharp(whiteCircleSvg)
      .composite([{ input: resizedEmblem, left: offset, top: offset }])
      .png()
      .toBuffer();

    return icon;
  }

  // Helper to create adaptive foreground icon:
  // - 108dp canvas (transparent)
  // - Android safe zone is center 72dp (66.6% of 108dp)
  async function createAdaptiveForeground(size) {
    const emblemPx = Math.round(size * 0.72);
    const offset = Math.round((size - emblemPx) / 2);

    const resizedEmblem = await sharp(greenEmblemBuffer)
      .resize(emblemPx, emblemPx, { fit: 'contain', kernel: 'lanczos3' })
      .toBuffer();

    const transparentBase = Buffer.from(`
      <svg width="${size}" height="${size}">
        <rect width="${size}" height="${size}" fill="none" />
      </svg>
    `);

    const icon = await sharp(transparentBase)
      .composite([{ input: resizedEmblem, left: offset, top: offset }])
      .png()
      .toBuffer();

    return icon;
  }

  // Android mipmap definitions: [folder, launcherSize, foregroundSize]
  const androidConfigs = [
    { folder: 'mipmap-mdpi', size: 48, fgSize: 108 },
    { folder: 'mipmap-hdpi', size: 72, fgSize: 162 },
    { folder: 'mipmap-xhdpi', size: 96, fgSize: 216 },
    { folder: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
    { folder: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
  ];

  for (const cfg of androidConfigs) {
    const dir = path.join(rootDir, 'android/app/src/main/res', cfg.folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // 1. ic_launcher.png (clean white circular icon)
    const roundIcon = await createRoundIcon(cfg.size, 0.83);
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), roundIcon);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), roundIcon);

    // 2. ic_launcher_foreground.png (for adaptive icon)
    const fg = await createAdaptiveForeground(cfg.fgSize);
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fg);

    console.log(`Generated ${cfg.folder} (${cfg.size}px & fg ${cfg.fgSize}px)`);
  }

  // Generate Play Store 512x512 icon with full white circular plate
  const playStoreIcon = await createRoundIcon(512, 0.83);
  fs.writeFileSync(path.join(rootDir, 'android/playstore-icon.png'), playStoreIcon);
  console.log('Generated android/playstore-icon.png (512x512)');

  // Also update public icons
  const publicSquare512 = await createRoundIcon(512, 0.83);
  fs.writeFileSync(path.join(rootDir, 'public/logo-square.png'), publicSquare512);

  const publicIcon192 = await createRoundIcon(192, 0.83);
  fs.writeFileSync(path.join(rootDir, 'public/icon.png'), publicIcon192);

  const public160 = await createRoundIcon(160, 0.83);
  fs.writeFileSync(path.join(rootDir, 'public/images/logo-infinity.png'), public160);

  const publicWebp160 = await sharp(public160).webp({ quality: 90 }).toBuffer();
  fs.writeFileSync(path.join(rootDir, 'public/images/logo-infinity.webp'), publicWebp160);

  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
