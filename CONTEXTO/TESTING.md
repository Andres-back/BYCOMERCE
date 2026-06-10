# TESTING.md

# OBJETIVO

Definir la estrategia de testing de Mocoa Market.

Alcance:

- Pirámide de tests.
- Unit tests.
- Integration tests.
- E2E tests.
- Tests de seguridad.
- Cobertura.
- Performance testing (básico).
- Herramientas.

Detalle de CI/CD: [[CI_CD.md]].

---

# DECISIÓN ARQUITECTÓNICA

Stack:

- **Backend unit + integration**: Jest (nativo en NestJS).
- **Backend e2e**: Jest + supertest.
- **Frontend unit**: Jest + React Testing Library.
- **Frontend e2e**: Playwright.
- **Seguridad**: OWASP ZAP (básico, manual).
- **Performance**: k6 (opcional, fase 2).

Cobertura objetivo:

- Backend: 70% líneas, 60% branches.
- Frontend: 30% líneas (solo crítico).
- E2E: flujos críticos cubiertos.

---

# PIRÁMIDE DE TESTS

```
       /\
      /  \      E2E (pocos, lentos, alto valor)
     /----\
    /      \    Integration (moderado)
   /--------\
  /          \  Unit (muchos, rápidos)
 /____________\
```

## Distribución objetivo

- Unit: 70% de los tests.
- Integration: 20%.
- E2E: 10%.

## Cuándo usar cada uno

| Tipo | Caso de uso |
|------|-------------|
| Unit | Lógica de negocio, validaciones, funciones puras, helpers |
| Integration | Endpoints HTTP con DB, servicios con dependencias reales |
| E2E | Flujos completos críticos: login, venta, pedido |

---

# UNIT TESTS (Backend)

## Herramientas

- Jest (incluido en NestJS).
- @nestjs/testing para mockear providers.

## Estructura

```typescript
// sales.service.spec.ts
describe('SalesService', () => {
  let service: SalesService;
  let prisma: PrismaService;
  let inventory: InventoryService;
  let audit: AuditService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InventoryService, useValue: mockInventory },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(SalesService);
    prisma = module.get(PrismaService);
    inventory = module.get(InventoryService);
    audit = module.get(AuditService);
  });

  describe('createSale', () => {
    it('should create a sale and update stock', async () => { ... });
    it('should throw INSUFFICIENT_STOCK if not enough', async () => { ... });
    it('should audit the operation', async () => { ... });
    it('should handle multiple payment methods', async () => { ... });
  });
});
```

## Cobertura mínima

- Validaciones de DTO.
- Lógica de negocio (cálculos, reglas).
- Manejo de errores.
- Edge cases.

## Excluir de cobertura

- Guards.
- Interceptors.
- Decoradores.
- main.ts.
- DTOs puros (sin lógica).
- Configuraciones.

---

# INTEGRATION TESTS (Backend)

## Setup

DB PostgreSQL real (puede ser en Docker efímero en CI).

```typescript
// sales.controller.integration.spec.ts
describe('SalesController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    prisma = module.get(PrismaService);
  });

  beforeEach(async () => {
    // Limpiar DB
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    // ... otras tablas
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /sales creates a sale', async () => {
    const token = await getAuthToken();
    const response = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [...], paymentMethod: 'EFECTIVO' })
      .expect(201);

    expect(response.body.data.id).toBeDefined();
    expect(response.body.data.total).toBeGreaterThan(0);
  });
});
```

## Aislamiento

- Cada test limpia sus datos.
- Seed mínimo al inicio.
- No depender del orden de tests.

## DB de test

En CI, usar:

```yaml
services:
  postgres:
    image: postgis/postgis:15-3.4
    env:
      POSTGRES_DB: mocoa_test
    options: --health-cmd pg_isready
```

Levantar y migrar antes de los tests.

---

# E2E TESTS (Backend)

## Críticos a cubrir

1. **Auth**: login, refresh, logout, cambio de contraseña.
2. **POS**: venta completa, devolución, anulación.
3. **Pedidos**: crear, confirmar, rechazar, entregar.
4. **Inventario**: ajuste, compra, stock reservado.
5. **Multi-tenant**: aislamiento entre tenants.
6. **Suscripción**: cambio de plan, validación de límites.

## Estructura

```typescript
describe('Sale flow (e2e)', () => {
  let token: string;
  let tenantId: string;

  beforeAll(async () => {
    // Crear tenant de prueba con seed
    const tenant = await createTestTenant();
    tenantId = tenant.id;
    token = await loginAsAdmin(tenantId);
  });

  it('creates a sale, updates inventory, generates audit', async () => {
    // 1. Crear producto
    const product = await createProduct(tenantId, { stock: 10, precio: 100000 });
    
    // 2. Venta
    const sale = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product.id, cantidad: 2 }] })
      .expect(201);
    
    // 3. Verificar inventario
    const updated = await getProduct(product.id);
    expect(updated.stock).toBe(8);
    
    // 4. Verificar audit
    const audits = await prisma.auditLog.findMany({
      where: { entityId: sale.body.data.id }
    });
    expect(audits).toContainEqual(expect.objectContaining({ accion: 'SALE_CREATED' }));
  });
});
```

---

# UNIT TESTS (Frontend)

## Herramientas

- Jest + React Testing Library.
- @testing-library/user-event para interacciones.
- MSW (Mock Service Worker) para mockear API.

## Estructura

```typescript
// ProductCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ProductCard } from './ProductCard';

describe('ProductCard', () => {
  it('renders product info', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Zapato Nike')).toBeInTheDocument();
    expect(screen.getByText('$150.000')).toBeInTheDocument();
  });

  it('shows "Agotado" badge when out of stock', () => {
    render(<ProductCard product={{ ...mockProduct, stock: 0 }} />);
    expect(screen.getByText('Agotado')).toBeInTheDocument();
  });
});
```

## Cobertura mínima

- Componentes de UI complejos.
- Hooks personalizados.
- Utilidades.
- Validaciones de forms.
- Servicios de API (con mocks).

## No testear

- Componentes de UI puros (botones, inputs) a menos que tengan lógica.
- Estilos.
- Snapshots (fragilizan tests).

---

# E2E TESTS (Frontend - Playwright)

## Setup

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  baseURL: 'http://localhost:3000',
  use: {
    trace: 'on-first-retry',
    screenshot: 'on',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
});
```

## Críticos a cubrir

1. **Login de admin y cajero**.
2. **Crear producto en inventario**.
3. **Realizar venta en POS**.
4. **Hacer pedido desde catálogo público**.
5. **Confirmar pedido en panel del comercio**.
6. **Ver dashboard con datos**.

## Estructura

```typescript
// e2e/pos-sale.spec.ts
import { test, expect } from '@playwright/test';

test('cajero realiza venta', async ({ page }) => {
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', 'cajero@test.com');
  await page.fill('input[name="password"]', 'Test1234!');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/admin/pos');
  
  await page.fill('input[name="barcode"]', '7701234567890');
  await page.press('input[name="barcode"]', 'Enter');
  
  await page.click('button:has-text("Cobrar")');
  await page.click('button:has-text("Efectivo")');
  await page.fill('input[name="montoRecibido"]', '50000');
  await page.click('button:has-text("Finalizar")');
  
  await expect(page.locator('text=Venta completada')).toBeVisible();
});
```

## Ejecución

- Local: `npm run test:e2e` con UI mode.
- CI: `npm run test:e2e:ci` (sin UI, sin retry).
- Staging: post-deploy, suite crítica.

---

# TESTS DE SEGURIDAD

## OWASP ZAP (básico)

- Escaneo automatizado en staging.
- Detección de vulnerabilidades comunes.
- Integración en CI (mensual, no en cada PR por tiempo).

## Manuales

Trimestral:

- Test de inyección SQL manual.
- Test de XSS manual.
- Test de CSRF.
- Test de autenticación.
- Test de autorización (cross-tenant).
- Test de rate limit.

## Dependencias

- `npm audit` en cada CI.
- Trivy sobre imágenes Docker.
- Snyk (opcional, fase 2).

---

# TESTS DE PERFORMANCE

## k6 (opcional, fase 2)

Scripts para validar:

- 100 RPS en endpoints de lectura.
- 10 RPS en endpoints de escritura.
- Latencia p95 < 500ms en lectura.
- Latencia p95 < 1s en escritura.

Ejecutar antes de releases grandes.

## En CI (básico)

- Smoke test de carga: 10 RPS por 30s.
- Si falla, alerta.

---

# COBERTURA

## Umbrales

```json
// jest.config.js
{
  "coverageThreshold": {
    "global": {
      "branches": 60,
      "functions": 70,
      "lines": 70,
      "statements": 70
    }
  }
}
```

Si no se alcanza, CI falla.

## Reportes

- HTML: `coverage/index.html`.
- LCOV: para Codecov o SonarQube.
- Badge en README.

## Exclusiones

```json
"coveragePathIgnorePatterns": [
  "/node_modules/",
  "/dist/",
  "/test/",
  "/migrations/",
  ".module.ts$",
  ".dto.ts$",
  "main.ts$"
]
```

---

# TESTS DE AISLAMIENTO MULTI-TENANT

Test específico que es OBLIGATORIO.

```typescript
describe('Multi-tenant isolation', () => {
  let tenantA, tenantB;
  let tokenA, tokenB;

  beforeAll(async () => {
    tenantA = await createTestTenant('A');
    tenantB = await createTestTenant('B');
    tokenA = await login(tenantA.admin);
    tokenB = await login(tenantB.admin);
  });

  it('tenant A cannot see tenant B products', async () => {
    await createProduct(tenantA, { nombre: 'ProductA' });
    await createProduct(tenantB, { nombre: 'ProductB' });

    const resA = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(resA.body.data).toHaveLength(1);
    expect(resA.body.data[0].nombre).toBe('ProductA');
  });

  it('tenant A cannot update tenant B product', async () => {
    const productB = await createProduct(tenantB, { nombre: 'ProductB' });

    await request(app)
      .patch(`/api/v1/products/${productB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ nombre: 'Hacked' })
      .expect(403);
  });

  // Repetir para: customers, sales, orders, etc.
});
```

---

# DATA DE PRUEBA

## Fixtures

```typescript
// fixtures/products.ts
export const productFixture = (overrides?: Partial<Product>) => ({
  id: randomUUID(),
  tenantId: 'test-tenant',
  nombre: 'Producto Test',
  precio: 100000,
  stock: 10,
  ...overrides,
});
```

## Seed de test

```typescript
// seed/seed-test.ts
export async function seedTestData(prisma: PrismaService) {
  await prisma.tenant.create({ data: testTenant });
  await prisma.user.createMany({ data: testUsers });
  await prisma.product.createMany({ data: testProducts });
  await prisma.category.createMany({ data: testCategories });
}
```

## Limpieza

- Truncate después de cada test.
- O usar `BEGIN; ... ROLLBACK;` (más rápido pero no soporta transacciones anidadas en algunos casos).

---

# ESTRUCTURA DE CARPETAS

```
backend/
  src/
    modules/
      sales/
        sales.service.ts
        sales.service.spec.ts        # unit
        sales.controller.ts
        sales.controller.spec.ts     # unit
        sales.controller.integration.spec.ts  # integration
  test/
    e2e/
      sales-flow.e2e-spec.ts
    fixtures/
      products.ts
    helpers/
      auth.ts
      db.ts

frontend/
  src/
    modules/
      pos/
        components/
          ProductSearch.tsx
          ProductSearch.test.tsx
        hooks/
          useCart.ts
          useCart.test.ts
  e2e/
    pos-sale.spec.ts
    pedido-flow.spec.ts
```

---

# CI

Detalle: [[CI_CD.md]].

Pipeline:

1. Lint
2. Typecheck
3. Unit tests (con coverage)
4. Integration tests (con services)
5. E2E backend (con services)
6. E2E frontend (con backend levantado)
7. Security scan
8. Build images

Tiempo objetivo: < 15 min total.

---

# DEBUGGING DE TESTS FALLIDOS

- Re-ejecutar solo el test: `npm test -- --testNamePattern="..."`.
- Verbose: `npm test -- --verbose`.
- Logs: `DEBUG=* npm test`.
- Playwright UI: `npm run test:e2e -- --ui`.
- Playwright trace: descargar y abrir `trace.zip`.

---

# MÉTRICAS

- Cobertura de líneas.
- Cobertura de branches.
- Tests pasando / fallando por run.
- Tiempo de ejecución de la suite.
- Flakiness rate (% tests flaky).

Detalle: [[MONITOREO.md]].

---

# EVENTOS RELACIONADOS

- `test.passed`
- `test.failed`
- `coverage.decreased`
- `ci.failed`

Detalle: [[EVENTOS.md]].

---

# REGLAS CRÍTICAS

- Test escrito junto al feature (no después).
- Todo bugfix lleva test de regresión.
- Todo test debe ser determinístico (no flaky).
- Ningún test puede depender de otro.
- Datos de test aislados por suite.
- No usar producción ni datos reales en tests.
- Coverage mínimo enforced en CI.
- E2E solo para flujos críticos (lentos).
- Mockear solo lo necesario, no todo.
- Tests de seguridad ejecutados regularmente.
