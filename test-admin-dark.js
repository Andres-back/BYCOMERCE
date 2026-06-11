const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  // Go to login
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });
  
  // Login as admin
  await page.fill('#email', 'admin@demo.com');
  await page.fill('#password', 'Admin1234!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  // Check we're on admin
  const url = page.url();
  console.log('URL:', url);
  
  if (url.includes('/admin')) {
    // Toggle dark mode
    const toggleBtn = await page.$('button[title*="oscuro"], button[title*="claro"]');
    if (toggleBtn) {
      await toggleBtn.click();
      await page.waitForTimeout(500);
    }
    
    const adminResult = await page.evaluate(() => {
      const root = document.documentElement;
      const cls = root.className;
      
      // Find sidebar
      const aside = document.querySelector('aside');
      const sidebarDiv = aside ? aside.querySelector('div') : null;
      
      return {
        class: cls,
        sidebarVar: getComputedStyle(root).getPropertyValue('--color-sidebar').trim(),
        sidebarElBg: aside ? getComputedStyle(aside).backgroundColor : 'no-aside',
        sidebarDivBg: sidebarDiv ? getComputedStyle(sidebarDiv).backgroundColor : 'no-div',
      };
    });
    
    console.log('Admin dark mode:', JSON.stringify(adminResult, null, 2));
  }
  
  await page.screenshot({ path: 'screenshots/_admin-dark-test.png' });
  await browser.close();
})();
