const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/01-homepage.png', fullPage: true });
  console.log('✅ Homepage captured');
  
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/04-dashboard.png', fullPage: true });
  console.log('✅ Dashboard captured');
  
  await browser.close();
})();
