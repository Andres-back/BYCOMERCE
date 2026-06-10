const { chromium } = require('playwright');
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001/api/v1';
const http = require('http');

function loginApi(email, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email, password });
    const req = http.request(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body).data); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getProfile(token) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body).data); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const users = [
    { email: 'admin@demo.com', password: 'Admin1234!', name: 'ADMIN_NEGOCIO' },
    { email: 'supervisor@demo.com', password: 'Super1234!', name: 'SUPERVISOR' },
    { email: 'cajero@demo.com', password: 'Cajero1234!', name: 'CAJERO' },
    { email: 'domiciliario@demo.com', password: 'Domi1234!', name: 'DOMICILIARIO' },
  ];

  for (const user of users) {
    console.log(`\n=== ${user.name} (${user.email}) ===`);

    const auth = await loginApi(user.email, user.password);
    const profile = await getProfile(auth.accessToken);
    console.log(`  Rol: ${profile.rol}`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    // Set auth
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.evaluate((data) => {
      const authStorage = {
        state: { token: data.token, user: data.user, isAuthenticated: true },
        version: 0,
      };
      localStorage.setItem('mocoa-auth', JSON.stringify(authStorage));
      localStorage.setItem('mocoa_access_token', data.token);
      document.cookie = `mocoa-auth=${data.token}; path=/; max-age=86400; SameSite=Lax`;
    }, { token: auth.accessToken, user: profile });

    // Go to admin
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check current URL (did middleware redirect to login?)
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/login')) {
      console.log(`  ❌ Redirigido al login (cookie no reconocida)`);
    } else {
      console.log(`  ✅ Dashboard accesible`);
    }

    // Check which nav items are visible
    const navLinks = await page.$$eval('nav a', (links) =>
      links.map((l) => ({ href: l.getAttribute('href'), text: l.textContent?.trim() }))
    );
    console.log(`  Menú visible:`);
    navLinks.forEach((l) => {
      if (l.href && l.href.startsWith('/admin') && l.href !== '/admin') {
        console.log(`    • ${l.text || l.href}`);
      }
    });

    await context.close();
    await browser.close();
  }

  console.log('\n✅ Prueba de roles completada');
})();
