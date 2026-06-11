const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });
  await page.fill('#email', 'admin@demo.com');
  await page.fill('#password', 'Admin1234!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  });
  await page.waitForTimeout(500);
  
  const r = await page.evaluate(() => {
    const main = document.querySelector('[class*="min-h-screen"]');
    const sidebar = document.querySelector('aside');
    const header = document.querySelector('header');
    
    return {
      mainBg: main ? getComputedStyle(main).backgroundColor : 'no',
      sidebarBg: sidebar ? getComputedStyle(sidebar).backgroundColor : 'no',
      headerBg: header ? getComputedStyle(header).backgroundColor : 'no',
    };
  });
  
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})();
