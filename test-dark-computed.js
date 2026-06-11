const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  const before = await page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    const color = getComputedStyle(document.body).color;
    return { htmlClass: document.documentElement.className, bg, color };
  });
  console.log('Before:', JSON.stringify(before));
  
  // Force dark mode
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  });
  await page.waitForTimeout(500);
  
  const after = await page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    const color = getComputedStyle(document.body).color;
    const htmlClass = document.documentElement.className;
    return { htmlClass, bg, color };
  });
  console.log('After:', JSON.stringify(after));
  
  console.log('Dark mode works:', before.bg !== after.bg);
  
  await browser.close();
})();
