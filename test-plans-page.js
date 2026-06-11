const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch({ headless: true });
  const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await c.newPage();
  
  await p.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });
  await p.fill('#email', 'superadmin@mocoamarket.com');
  await p.fill('#password', 'SuperAdmin123!');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(5000);
  
  await p.goto('http://localhost:3000/admin/superadmin/plans', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  
  const html = await p.content();
  const checks = ['Basico', 'Profesional', 'Premium', 'Enterprise', 'Planes', 'Lista de planes', 'No hay', 'login'];
  checks.forEach(word => {
    if (html.toLowerCase().includes(word.toLowerCase())) console.log('  Found: ' + word);
  });
  
  console.log('Page title:', await p.title());
  console.log('URL:', p.url());
  
  await p.screenshot({ path: 'screenshots/_plans_page.png' });
  await b.close();
  console.log('Done');
})();
