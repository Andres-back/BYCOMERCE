const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
  });
  
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
  
  console.log('1. Going to login page...');
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  console.log('2. Filling credentials...');
  await page.fill('#email', 'superadmin@mocoamarket.com');
  await page.fill('#password', 'SuperAdmin123!');
  
  console.log('3. Clicking submit...');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(8000);
  
  console.log('4. Final URL:', page.url());
  await page.screenshot({ path: 'screenshots/_login_final.png' });
  
  // Check if we're on admin page
  if (page.url().includes('/admin')) {
    console.log('5. LOGIN SUCCESSFUL!');
    
    // Navigate to plans
    await page.goto('http://localhost:3000/admin/superadmin/plans', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    console.log('6. Plans page URL:', page.url());
    await page.screenshot({ path: 'screenshots/_plans_final.png' });
    
    const html = await page.content();
    if (html.includes('Basico')) console.log('7. Plans VISIBLE!');
    else console.log('7. Plans NOT visible');
  } else {
    console.log('5. LOGIN FAILED - showing:', page.url());
  }
  
  await browser.close();
})();
