const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  
  page.on('response', response => {
    if (response.url().includes('/api/v1/')) {
      console.log(`${response.status()} ${response.url().substring(0, 100)}`);
    }
  });
  
  // Login
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });
  await page.fill('#email', 'superadmin@mocoamarket.com');
  await page.fill('#password', 'SuperAdmin123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  
  console.log('--- After login ---');
  
  // Go to plans
  await page.goto('http://localhost:3000/admin/superadmin/plans', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  
  console.log('--- Plans page loaded ---');
  
  const html = await page.content();
  if (html.includes('Basico')) console.log('PLANS ARE VISIBLE!');
  else console.log('Plans not visible');
  
  await page.screenshot({ path: 'screenshots/_plans_final2.png' });
  await browser.close();
})();
