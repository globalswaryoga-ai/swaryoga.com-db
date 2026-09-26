const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Go to the local dev server
  await page.goto('http://localhost:3000/admin/crm/new-registration', { waitUntil: 'networkidle2' });
  
  // Get the HTML of the main area
  const html = await page.evaluate(() => {
    return document.querySelector('main').innerHTML;
  });
  
  if (html.includes('Workshop Registration Form Setup')) {
    console.log("SUCCESS: Form is in the DOM for English (default language)!");
  } else {
    console.log("FAILED: Form is NOT in the DOM for English.");
    console.log("HTML length:", html.length);
  }
  
  await browser.close();
})();
