const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  
  console.log('1. Go to login page');
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  console.log('2. Fill superadmin credentials');
  await page.fill('#email', 'superadmin@mocoamarket.com');
  await page.fill('#password', 'SuperAdmin123!');
  
  console.log('3. Click submit');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  
  console.log('4. URL after login:', page.url());
  await page.screenshot({ path: 'screenshots/_login_test.png' });
  
  console.log('5. Navigate to plans');
  await page.goto('http://localhost:3000/admin/superadmin/plans', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  console.log('6. URL after navigating to plans:', page.url());
  await page.screenshot({ path: 'screenshots/_plans_test.png' });
  
  // Check page content
  const html = await page.content();
  if (html.includes('Basico')) console.log('7. Plans found in page!');
  else if (html.includes('Iniciar sesion')) console.log('7. Redirected to login :(');
  else console.log('7. Unknown content - length:', html.length);
  
  await browser.close();
  console.log('Done');
})();
