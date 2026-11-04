const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function capturePlayStoreScreenshots() {
  const outputDir = path.join(__dirname, 'playstore_screenshots');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  // Standard high-res phone portrait resolution: 1080 x 2400 (aspect ratio 9:20)
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.625 });

  const routes = [
    { name: '01_home_screen', url: 'https://swaryoga.com/', waitMs: 4000 },
    { name: '02_community_feed', url: 'https://swaryoga.com/community', waitMs: 4000 },
    { name: '03_workshops_catalog', url: 'https://swaryoga.com/workshops', waitMs: 4000 },
    { name: '04_life_planner', url: 'https://swaryoga.com/life-planner', waitMs: 4000 },
    { name: '05_sadhana_tracker', url: 'https://swaryoga.com/community', waitMs: 3000 }
  ];

  for (const item of routes) {
    console.log(`📸 Capturing ${item.name} from ${item.url}...`);
    try {
      await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, item.waitMs));
      
      const filePath = path.join(outputDir, `${item.name}.png`);
      await page.screenshot({ path: filePath, type: 'png' });
      console.log(`✅ Saved: ${filePath}`);
    } catch (err) {
      console.error(`❌ Error capturing ${item.name}:`, err.message);
    }
  }

  await browser.close();
  console.log('🎉 All Play Store screenshots captured successfully!');
}

capturePlayStoreScreenshots();
