const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  
  const result = await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    
    const root = document.documentElement;
    const bgVar = getComputedStyle(root).getPropertyValue('--color-background').trim();
    const fgVar = getComputedStyle(root).getPropertyValue('--color-foreground').trim();
    
    const card = document.querySelector('[class*="card"]');
    const cardBg = card ? getComputedStyle(card).backgroundColor : 'no-card';
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    
    return { bgVar, fgVar, cardBg, bodyBg, htmlClass: root.className };
  });
  
  console.log(JSON.stringify(result, null, 2));
  
  // Also check if stylesheet has .dark rules
  const hasDarkRules = await page.evaluate(() => {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText === '.dark') return true;
        }
      } catch(e) {}
    }
    return false;
  });
  console.log('Has .dark CSS rules:', hasDarkRules);
  
  await browser.close();
})();
