const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const srcPath = '/Users/mohankalburgi/.gemini/antigravity-ide/brain/c723fdac-2560-448e-998e-3aec45dded15/.user_uploaded/media_1792769945264.png';
const resDir = path.resolve(__dirname, '../android/app/src/main/res');

const densities = [
  { name: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { name: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { name: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { name: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { name: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
  { name: 'mipmap-ldpi', size: 36, fgSize: 81 }
];

async function generate() {
  console.log('Generating Android app icons...');

  let largestRoundIconBuffer = null;

  for (const d of densities) {
    const dir = path.join(resDir, d.name);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // 1. FOREGROUND (adaptive icon)
    // fgSize canvas: 108dp. Mask is 72dp.
    // Target emblem diameter = 82% of 72dp mask
    const targetEmblemDiam = Math.round(d.fgSize * (72 * 0.82) / 108);
    const scaledFullSize = Math.round(1024 * (targetEmblemDiam / 896));

    const resizedForFg = await sharp(srcPath)
      .resize(scaledFullSize, scaledFullSize)
      .png()
      .toBuffer();

    const leftFg = Math.round((d.fgSize - scaledFullSize) / 2);
    const topFg = Math.round((d.fgSize - scaledFullSize) / 2);

    const fgBuffer = await sharp({
      create: {
        width: d.fgSize,
        height: d.fgSize,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      }
    })
    .composite([{ input: resizedForFg, left: leftFg, top: topFg }])
    .png()
    .toBuffer();

    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fgBuffer);

    // 2. ROUND ICON (ic_launcher_round.png)
    const roundEmblemDiam = Math.round(d.size * 0.82);
    const roundScaledFullSize = Math.round(1024 * (roundEmblemDiam / 896));
    const resizedForRound = await sharp(srcPath)
      .resize(roundScaledFullSize, roundScaledFullSize)
      .png()
      .toBuffer();

    const leftRound = Math.round((d.size - roundScaledFullSize) / 2);
    const topRound = Math.round((d.size - roundScaledFullSize) / 2);

    const onWhite = await sharp({
      create: {
        width: d.size,
        height: d.size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 255 }
      }
    })
    .composite([{ input: resizedForRound, left: leftRound, top: topRound }])
    .png()
    .toBuffer();

    const r = d.size / 2;
    const circleMaskSvg = Buffer.from(
      `<svg width="${d.size}" height="${d.size}"><circle cx="${r}" cy="${r}" r="${r}" fill="#000000"/></svg>`
    );
    const circleMask = await sharp(circleMaskSvg).png().toBuffer();

    const roundIconBuffer = await sharp(onWhite)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), roundIconBuffer);
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), roundIconBuffer);

    if (d.size === 192) {
      largestRoundIconBuffer = roundIconBuffer;
    }

    console.log(`Updated ${d.name}: fg=${d.fgSize}x${d.fgSize}, icon=${d.size}x${d.size}`);
  }

  // 3. Splash logo (android/app/src/main/res/drawable/splash_logo.png)
  const splashSize = 384;
  const splashEmblemDiam = Math.round(splashSize * 0.86);
  const splashScaledSize = Math.round(1024 * (splashEmblemDiam / 896));
  const splashResized = await sharp(srcPath).resize(splashScaledSize, splashScaledSize).png().toBuffer();
  const splashOnWhite = await sharp({
    create: {
      width: splashSize,
      height: splashSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 255 }
    }
  })
  .composite([{ input: splashResized, left: Math.round((splashSize - splashScaledSize) / 2), top: Math.round((splashSize - splashScaledSize) / 2) }])
  .png()
  .toBuffer();

  const splashRadius = splashSize / 2;
  const splashMaskSvg = Buffer.from(
    `<svg width="${splashSize}" height="${splashSize}"><circle cx="${splashRadius}" cy="${splashRadius}" r="${splashRadius}" fill="#000000"/></svg>`
  );
  const splashMask = await sharp(splashMaskSvg).png().toBuffer();
  const splashFinal = await sharp(splashOnWhite)
    .composite([{ input: splashMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(resDir, 'drawable/splash_logo.png'), splashFinal);
  console.log('Updated splash_logo.png');

  // 4. Update web icons (public/icon.png, public/splash-logo.png)
  if (largestRoundIconBuffer) {
    fs.writeFileSync(path.resolve(__dirname, '../public/icon.png'), largestRoundIconBuffer);
  }
  fs.writeFileSync(path.resolve(__dirname, '../public/splash-logo.png'), splashFinal);
  console.log('Updated public web icons');
  console.log('ALL ICONS GENERATED SUCCESSFULLY!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
