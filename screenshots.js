const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001/api/v1';

const PAGES = [
  { name: '01-homepage', path: '/', description: 'Marketplace principal' },
  { name: '02-login', path: '/auth/login', description: 'Página de login' },
  { name: '03-business-catalog', path: '/negocio/tienda-demo-mocoa', description: 'Catálogo de negocio' },
  { name: '04-dashboard', path: '/admin', description: 'Dashboard admin' },
  { name: '05-customers', path: '/admin/customers', description: 'Clientes' },
  { name: '06-inventory', path: '/admin/inventory', description: 'Inventario' },
  { name: '07-purchases', path: '/admin/purchases', description: 'Compras' },
  { name: '08-orders', path: '/admin/orders', description: 'Pedidos' },
  { name: '09-pos', path: '/admin/pos', description: 'Punto de venta' },
  { name: '10-cash', path: '/admin/cash', description: 'Caja' },
  { name: '11-users', path: '/admin/users', description: 'Usuarios' },
  { name: '12-plans', path: '/admin/plans', description: 'Planes' },
  { name: '13-settings', path: '/admin/settings', description: 'Configuración' },
  { name: '14-reports', path: '/admin/reports', description: 'Reportes' },
  { name: '15-notifications', path: '/admin/notifications', description: 'Notificaciones' },
  { name: '16-delivery', path: '/admin/delivery', description: 'Domiciliarios' },
  { name: '17-promotions', path: '/admin/promotions', description: 'Promociones' },
  { name: '18-loyalty', path: '/admin/loyalty', description: 'Fidelización' },
  { name: '19-branches', path: '/admin/branches', description: 'Sucursales' },
  { name: '20-delivery-route', path: '/admin/delivery/route', description: 'Ruta de entrega' },
  { name: '21-superadmin-dashboard', path: '/admin/superadmin', description: 'Panel Superadmin' },
  { name: '22-superadmin-tenants', path: '/admin/superadmin/tenants', description: 'Gestión de tenants' },
  { name: '23-superadmin-plans', path: '/admin/superadmin/plans', description: 'Planes (Superadmin)' },
  { name: '24-superadmin-audit', path: '/admin/superadmin/audit', description: 'Auditoría' },
];

(async () => {
  console.log(' Iniciando capturas de pantalla...\n');

  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  // Login via API
  console.log('🔐 Autenticando...');
  let auth = null;
  try {
    const loginRes = await new Promise((resolve, reject) => {
      const data = JSON.stringify({ email: 'admin@demo.com', password: 'Admin1234!' });
      const req = http.request(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      }, (res) => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve(JSON.parse(b).data); } catch (e) { reject(e); } }); });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
    const profileRes = await new Promise((resolve, reject) => {
      const req = http.request(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${loginRes.accessToken}` },
      }, (res) => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve(JSON.parse(b).data); } catch (e) { reject(e); } }); });
      req.on('error', reject);
      req.end();
    });
    auth = { token: loginRes.accessToken, user: profileRes };
    console.log(`  ✅ ${profileRes.email} (${profileRes.rol})`);
  } catch (e) {
    console.error(`  ❌ ${e.message}`);
  }

  const browser = await chromium.launch({ headless: true });
  // Single context for all pages (preserves localStorage/cookies)
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

  for (const pageConfig of PAGES) {
    console.log(`\n📸 ${pageConfig.description} (${pageConfig.path})`);
    const page = await context.newPage();

    try {
      // Set auth before navigating to admin pages
      if (auth && pageConfig.path.startsWith('/admin')) {
        // Set cookie for middleware (server-side auth)
        await context.addCookies([{
          name: 'mocoa-auth',
          value: auth.token,
          domain: 'localhost',
          path: '/',
          httpOnly: false,
          sameSite: 'Lax',
        }]);

        // Set auth before navigating to admin pages
        await page.route('**/api/v1/**', (route) => {
          const headers = route.request().headers();
          headers['Authorization'] = `Bearer ${auth.token}`;
          route.continue({ headers });
        });
        
        // Set localStorage for Zustand store
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await page.evaluate((data) => {
          localStorage.setItem('mocoa-auth', JSON.stringify({
            state: { token: data.token, user: data.user, isAuthenticated: true },
            version: 0,
          }));
          localStorage.setItem('mocoa_access_token', data.token);
          document.cookie = `mocoa-auth=${data.token}; path=/; max-age=86400; SameSite=Lax`;
        }, auth);
      }

      await page.goto(`${BASE_URL}${pageConfig.path}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${pageConfig.name}.png`), fullPage: true });
      console.log(`  ✅ Guardado: ${pageConfig.name}.png`);
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  console.log('\n🎉 ¡Hecho!');
  const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
  console.log(`📊 ${files.length} capturas en screenshots/`);
  files.sort().forEach(f => console.log(`   ${f}`));
})();
