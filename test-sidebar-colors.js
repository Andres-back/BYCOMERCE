const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Login as admin first
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });
  await page.fill('#email', 'admin@demo.com');
  await page.fill('#password', 'Admin1234!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  // Now check the admin page
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  async function checkColors() {
    return await page.evaluate(() => {
      const sidebar = document.querySelector('aside');
      const header = document.querySelector('header');
      const main = document.querySelector('main');
      const body = document.body;
      
      const results = {
        htmlClass: document.documentElement.className,
        bodyBg: getComputedStyle(body).backgroundColor,
        bodyColor: getComputedStyle(body).color,
      };
      
      if (sidebar) {
        results['sidebarBg'] = getComputedStyle(sidebar).backgroundColor;
      }
      if (header) {
        results['headerBg'] = getComputedStyle(header).backgroundColor;
      }
      
      // CSS vars on root
      const root = document.documentElement;
      results['varSidebar'] = getComputedStyle(root).getPropertyValue('--color-sidebar').trim();
      results['varBg'] = getComputedStyle(root).getPropertyValue('--color-background').trim();
      
      return results;
    });
  }
  
  console.log('=== LIGHT MODE ===');
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  });
  await page.waitForTimeout(300);
  console.log(JSON.stringify(await checkColors(), null, 2));
  
  console.log('\n=== DARK MODE ===');
  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(300);
  console.log(JSON.stringify(await checkColors(), null, 2));
  
  await browser.close();
})();
