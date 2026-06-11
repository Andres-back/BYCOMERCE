const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  
  // Light mode - homepage
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/home-light.png' });
  console.log('1. Homepage light captured');
  
  // Toggle dark mode
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const title = await btn.getAttribute('title');
    if (title && (title.includes('oscuro') || title.includes('claro'))) {
      await btn.click();
      console.log('2. Clicked theme toggle');
      break;
    }
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshots/home-dark.png' });
  console.log('3. Homepage dark captured');
  
  const htmlClass = await page.evaluate(() => document.documentElement.className);
  console.log('4. Final html class:', htmlClass);
  
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/admin-dark.png' });
  console.log('5. Admin dark captured');
  
  await browser.close();
  console.log('Done');
})();
