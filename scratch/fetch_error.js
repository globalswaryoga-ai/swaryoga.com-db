const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Navigate to the local dev server
  await page.goto('http://localhost:3001/admin/crm/new-registration', { waitUntil: 'networkidle0' });
  
  // Try to find the error boundary
  const errorText = await page.evaluate(() => {
    const details = document.querySelector('details');
    if (details) return details.textContent;
    return document.body.innerText;
  });
  
  console.log("ERROR OUTPUT:");
  console.log(errorText);
  
  await browser.close();
})();
