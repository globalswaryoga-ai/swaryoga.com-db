const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function captureAllScreenshots() {
  const outputDir = path.join(__dirname, '../playstore_screenshots');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  // Standard phone portrait high-res (1080 x 2400)
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.625 });

  const screens = [
    { name: '01_home_screen', url: 'https://swaryoga.com/', waitMs: 4000 },
    { name: '02_community_feed', url: 'https://swaryoga.com/community', waitMs: 4000 },
    { name: '03_workshops_catalog', url: 'https://swaryoga.com/workshops', waitMs: 4000 },
    { name: '04_elearning_courses', url: 'https://swaryoga.com/e-learning', waitMs: 4000 },
    { name: '05_life_planner', url: 'https://swaryoga.com/life-planner', waitMs: 4000 },
    { name: '06_swar_resort', url: 'https://swaryoga.com/resort', waitMs: 4000 }
  ];

  for (const item of screens) {
    console.log(`📸 Capturing ${item.name} from ${item.url}...`);
    try {
      await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 35000 });
      await new Promise(r => setTimeout(r, item.waitMs));
      const targetPath = path.join(outputDir, `${item.name}.png`);
      await page.screenshot({ path: targetPath, type: 'png' });
      console.log(`✅ Saved: ${targetPath}`);
    } catch (err) {
      console.error(`❌ Error on ${item.name}:`, err.message);
    }
  }

  await browser.close();
  console.log('🎉 Done! All 6 screenshots ready.');
}

captureAllScreenshots();
