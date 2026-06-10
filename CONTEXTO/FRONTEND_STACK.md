# FRONTEND_STACK

Stack frontend oficial de Mocoa Market, validado con investigación de 5 agentes paralelos en junio 2026. Decisiones congeladas hasta nuevo aviso.

**Stack base obligatorio (ya en producción):**

- Next.js 16.2.7 (App Router, Turbopack)
- React 19.2.1
- TypeScript 5.9.3
- Node ≥ 22.12.0
- npm workspaces (monorepo)

**Dominio:** `mocoastore.alexsters.works` (multi-tenant, path-based Fase 1 → subdomain Fase 2)

**Mercado objetivo:** Putumayo/Colombia, mobile-first, 3G/4G rural.

---

# 1. CAPAS DEL STACK

## 1.1 UI / Estilos

| Librería | Versión | Razón |
|---|---|---|
| `shadcn/ui` (canary) | CLI: `npx shadcn@canary` | Default industria 2026. Copy-paste, ownership total. Compatible con RSC, theming por tenant via CSS vars. |
| `tailwindcss` | ^4.1.0 | CSS-first config (`@theme inline`), OKLCH nativo, detección automática de contenido. |
| `@tailwindcss/postcss` | ^4.1.0 | Plugin PostCSS oficial Tailwind v4. |
| `postcss` | latest | Necesario para Tailwind v4. |
| `tw-animate-css` | latest | Reemplazo de `tailwindcss-animate` (roto en Tailwind v4). Incluido por shadcn canary. |
| `lucide-react` | 0.555.0 (ya instalado) | Iconos. NO agregar segundo set. |
| `class-variance-authority` | latest | Variantes de componentes. Incluido por shadcn. |
| `clsx` | latest | Conditional classnames. Incluido por shadcn. |
| `tailwind-merge` | latest | Merge de clases Tailwind sin conflictos. Incluido por shadcn. |
| `next-themes` | ^0.4.0 | Dark mode. Estándar shadcn. `attribute="class"`, `disableTransitionOnChange`. |

**Setup:**
```bash
npm install -D tailwindcss @tailwindcss/postcss postcss
npm install lucide-react class-variance-authority clsx tailwind-merge next-themes
npx shadcn@canary init
```

**Configuración crítica:**
- `globals.css` debe usar `@import "tailwindcss"` + `@import "tw-animate-css"` + `@theme inline { ... }`.
- Colores **SIEMPRE en OKLCH** (no HSL).
- `<html lang="es-CO" suppressHydrationWarning>` para evitar warning de hidratación con next-themes.

**Theming multi-tenant (patrón oficial):**
```tsx
// app/layout.tsx
import { headers } from 'next/headers';
const tenant = await getTenantFromHost(headers().get('host'));
return <body style={{
  '--color-primary': tenant.theme.primary,
  '--radius': tenant.theme.radius,
} as React.CSSProperties}>{children}</body>;
```

**Riesgos:**
- Radix Primitives `asChild` + lazy references bug (#3776) en prod RSC. Workaround: descomponer trigger en Client Component.
- `tailwindcss-animate` (v3) NO funciona con Tailwind v4. Usar `tw-animate-css`.

---

## 1.2 Animaciones

| Librería | Versión pinned | Razón |
|---|---|---|
| `motion` | **12.18.1 (pinned)** | Ex-Framer Motion. Estándar 2026. Gestos mobile (drag, swipe). Pin exacto: 12.18.2-12.23.x rompen builds de Next 16. |
| `@formkit/auto-animate` | ^0.9.0 | 3KB. Para listas que se reordenan (carrito, filtros). |

**Importante:** importar de `motion/react`, NO de `framer-motion` (viejo).

**Patrón Next 16 + Turbopack + AnimatePresence:** usar `template.tsx` keyed por `usePathname()` en lugar de `layout.tsx` para que `AnimatePresence` vea el unmount en route changes.

**Riesgo:** correr `next build` antes de cada deploy. Dev mode no detecta el bug de Motion 12.18.2+.

---

## 1.3 Toasts / Notificaciones efímeras

| Librería | Versión | Razón |
|---|---|---|
| `sonner` | latest | Default de shadcn. 2.5-11 KB. ARIA polite/assertive, promise API. |

```bash
npx shadcn@canary add sonner
```

**Patrón con Server Actions de Next 16:**
```tsx
'use client';
const [state, action, isPending] = useActionState(serverAction, null);
useEffect(() => {
  if (state?.ok) toast.success('Pedido confirmado');
}, [state]);
```

---

## 1.4 Forms + Validación

| Librería | Versión | Razón |
|---|---|---|
| `react-hook-form` | ^7.55.0 | Battle-tested, 12M/semana, default de shadcn Form. |
| `@hookform/resolvers` | ^3.10.0 | Resolver Zod para RHF. |
| `zod` | ^4.0.0 | Single source of truth: misma schema en frontend y backend NestJS (vía `nestjs-zod`). |
| `nestjs-zod` (backend) | ^5.0.0 | Genera DTOs NestJS desde Zod, reemplaza class-validator. |

**Patrón:**
```ts
// lib/schemas/product.ts (compartido, sin imports de React/Next)
import { z } from 'zod';
export const ProductSchema = z.object({
  name: z.string().min(3).max(80),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(0),
});
```

**Mensajes en español:**
```ts
z.string({ message: 'Requerido' }).min(3, { message: 'Mínimo 3 caracteres' });
```

**Importante:** los schemas Zod se importan desde **ambos lados** del boundary cliente/servidor. Mantenerlos puros en `lib/schemas/`.

**Para reducir bundle en cliente:** `import { z } from 'zod/v4-mini'` baja de ~12KB a ~2KB. Compatible con `@hookform/resolvers`.

---

## 1.5 Data Tables

| Librería | Versión | Razón |
|---|---|---|
| `@tanstack/react-table` | ^8.0.0 | Headless, MIT, server-side ops, custom cells. |
| `@tanstack/react-virtual` | ^3.0.0 | Virtualización para >100 filas. |

**Patrón:** Server Component hace fetch inicial → pasa a Client Component con `useReactTable`. Columnas en archivo separado `columns.tsx`.

**No usar:** AG Grid Enterprise (server-side row model cuesta ~$1000+/dev/año). Community no soporta server-side row model real.

---

## 1.6 File Upload

| Librería | Versión | Razón |
|---|---|---|
| `react-dropzone` | ^14.0.0 | Headless, 12KB, drag&drop + preview. Combina con shadcn. |
| `@dnd-kit/core` | ^6.0.0 | Drag & drop reorder. |
| `@dnd-kit/sortable` | ^8.0.0 | Sortable lists (imágenes de producto). |
| `@dnd-kit/utilities` | ^3.0.0 | Helpers CSS para DndContext. |
| `@aws-sdk/client-s3` | ^3.0.0 | SDK S3-compatible (MinIO). |
| `@aws-sdk/s3-request-presigner` | ^3.0.0 | Generar presigned URLs. |

**Patrón 3 pasos (sign → upload → finalize):**
1. Cliente pide presigned URL a `/api/uploads/sign` (Route Handler, no Server Action).
2. Cliente sube directo a MinIO con `XMLHttpRequest` (progress real).
3. Cliente notifica al backend con el `key` final.

**Gotcha MinIO en Docker:** las presigned URLs usan hostname interno (`minio:9000`). Configurar override `MINIO_PUBLIC=http://localhost:9000` o usar `host.docker.internal` para que el browser resuelva bien.

**Límites MVP:**
- Tipos permitidos: `image/jpeg`, `image/png`, `image/webp`.
- Tamaño máx: 10MB.
- Máx 8 imágenes por producto.
- Path: `tenants/{tenantId}/products/{uuid}.{ext}`.

---

## 1.7 Date / Time

| Librería | Versión | Razón |
|---|---|---|
| `react-day-picker` | ^9.0.0 | Base del Calendar de shadcn. WCAG 2.1 AA, timezone-aware. |
| `date-fns` | ^4.0.0 | Tree-shakeable, locale `es` completo. |

```bash
npm install react-day-picker date-fns
npx shadcn@canary add calendar
```

**Timezone Colombia (UTC-5, sin DST):**
```tsx
import { es } from 'react-day-picker/locale';
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; // 'America/Bogota'
<Calendar mode="single" timeZone={tz} locale={es} />
```

**Tree-shaking crítico:** `import { format } from 'date-fns/format'` en lugar de `import { format } from 'date-fns'`. Reduce bundle hasta 80%.

---

## 1.8 Search

| Capa | Herramienta | Razón |
|---|---|---|
| **Búsqueda global catálogo** | PostgreSQL FTS (`tsvector` + `pg_trgm`) | $0 costo, suficiente para <5K productos, <50ms latencia. |
| **Filtros faceted** | `nuqs` + searchParams | URL state, server-side query. |
| **Command palette admin** | `fuse.js` ^7.0.0 | 4KB, fuzzy, ideal para <500 items. |
| **Fase 2 (>5K productos)** | Meilisearch self-hosted | Migrar cuando latencia >500ms. |

**Patrón búsqueda catálogo:**
```ts
// API NestJS: /products/search?q=&category=&minPrice=&maxPrice=
// Query: SELECT * FROM products WHERE
//   to_tsvector('spanish', name || ' ' || description) @@ plainto_tsquery('spanish', $1)
//   AND category = $2 AND price BETWEEN $3 AND $4
//   ORDER BY ts_rank(...) DESC LIMIT 50
```

**Patrón frontend (TanStack Query + debounce):**
```ts
const { data } = useQuery({
  queryKey: ['products', q, filters],
  queryFn: () => api.get('/products/search', { params: { q, ...filters } }),
  enabled: q.length > 2,
});
```

**Nunca** usar Fuse.js sobre >5K productos en el cliente (escaneo O(n), degrada a 800ms+).

---

## 1.9 Estado

| Tipo de estado | Herramienta | Ejemplo |
|---|---|---|
| **Server data** (lee/escribe API) | TanStack Query v5 + Server Actions | Lista productos, crear pedido, perfil usuario. |
| **URL state** (compartible, bookmark) | `nuqs` ^2.8.0 | Filtros catálogo, paginación, variante seleccionada. |
| **Form state** (en edición) | React Hook Form + Zod | Checkout, registro vendedor, formulario producto. |
| **UI state global** (transient) | Zustand 5 con `persist` | Carrito, modales, drawer, multi-step checkout. |
| **Local component state** | `useState` / `useReducer` | Toggle expand, tab activo. |
| **First-paint / request-scoped** (server-readable) | Cookie httpOnly | JWT, `tenant_id`, locale preferido, theme. |
| **Browser-only persistent** | `localStorage` con `skipHydration` | "No mostrar este tip de nuevo". |

**Regla mental:** ¿Se comparte por URL? → `nuqs`. ¿Servidor es la fuente? → cookie o TanStack Query. ¿Solo browser? → Zustand/localStorage. ¿Solo componente? → `useState`.

### Client state: Zustand 5

```bash
npm install zustand
```

**Patrón store factory (CRÍTICO para SSR, evita leaks cross-request):**

```ts
// stores/cart-store.ts
import { createStore } from 'zustand/vanilla';
import { persist, createJSONStorage } from 'zustand/middleware';

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
};

export const createCartStore = (initial?: Partial<CartState>) =>
  createStore<CartState>()(
    persist(
      (set) => ({
        items: initial?.items ?? [],
        addItem: (item) => set(/* ... */),
      }),
      {
        name: 'cart',
        storage: createJSONStorage(() => localStorage),
        partialize: (s) => ({ items: s.items }),
        skipHydration: true, // CRÍTICO para SSR
      }
    )
  );
```

```tsx
// providers/cart-provider.tsx
'use client';
const CartContext = createContext<ReturnType<typeof createCartStore> | null>(null);
export function CartProvider({ children, initialItems }) {
  const storeRef = useRef<ReturnType<typeof createCartStore>>();
  if (!storeRef.current) storeRef.current = createCartStore({ items: initialItems });
  return <CartContext.Provider value={storeRef.current}>{children}</CartContext.Provider>;
}
```

**Carrito multi-tenant:** cross-vendor global (UX más simple). Cada item guarda `storeId` para separar en checkout.

**Merge on login:** endpoint `/api/cart/merge` con estrategia "última-modificación-gana" por item.

### Server state: TanStack Query v5

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

**Patrón híbrido (Server Component + TanStack Query):**

```tsx
// app/dashboard/orders/page.tsx (Server Component)
import { HydrationBoundary, dehydrate, getQueryClient } from './_providers';

export default function OrdersPage() {
  const qc = getQueryClient();
  void qc.prefetchQuery({ queryKey: ['orders'], queryFn: getOrders });
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <OrdersList />  {/* Client Component con useSuspenseQuery */}
    </HydrationBoundary>
  );
}
```

**Configuración crítica:**
- `staleTime: 60_000` mínimo (default 0 anula el SSR prefetch).
- `getQueryClient()` factory con `isServer` check (NUNCA `new QueryClient()` a nivel módulo).
- Integración con Socket.io: hooks que llamen `qc.invalidateQueries()` o `qc.setQueryData()` al recibir evento.

### URL state: nuqs

```bash
npm install nuqs
```

**Patrón filtros catálogo:**
```ts
export const productFilters = {
  q: parseAsString.withDefault(''),
  category: parseAsString.withDefault(''),
  minPrice: parseAsInteger,
  maxPrice: parseAsInteger,
  color: parseAsArrayOf(parseAsString).withDefault([]),
  page: parseAsInteger.withDefault(1),
};
export const filtersCache = createSearchParamsCache(productFilters);
```

**Search-as-you-type con throttleMs:**
```ts
const [q, setQ] = useQueryState('q', parseAsString.withDefault('').withOptions({
  throttleMs: 300,
  shallow: false,  // re-renderiza RSC
}));
```

---

## 1.10 Auth

**Decisión:** solución custom sobre JWT del backend NestJS. NO usar Auth.js, NO usar Clerk.

```bash
npm install jose
```

**Componentes:**

1. **`proxy.ts`** (en Next 16, antes `middleware.ts`): lee cookie JWT, decodifica con `jose` (verifica firma + exp), inyecta `X-Tenant-Id` desde subdominio, redirige si expirado intentando refresh.
2. **`lib/auth.ts`**: helper `getSession()` server-side con `cache()` de React por request.
3. **Fetch client interceptor**: al recibir 401, llama `/auth/refresh` y reintenta.
4. **Context provider mínimo**: expone `user` a Client Components (hidratado desde Server Component raíz).

**Patrón:**
```ts
// lib/auth.ts
import { jwtVerify } from 'jose';
import { cache } from 'react';
import { cookies } from 'next/headers';

export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch {
    return null;
  }
});
```

**Riesgo:** `cookies()` y `headers()` son **async** en Next 16. Usar `await cookies()`.

---

## 1.11 WebSockets (Real-time)

| Librería | Versión | Razón |
|---|---|---|
| `socket.io-client` | ^4.8.0 | Coincide con server NestJS ya decidido. |

**Patrón singleton (CRÍTICO para HMR de Turbopack):**
```ts
// lib/socket.ts
import { io, type Socket } from 'socket.io-client';
let socket: Socket | null = null;
export function getSocket(token: string, tenantId: string) {
  if (socket?.connected) return socket;
  socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
    auth: { token },
    extraHeaders: { 'X-Tenant-Id': tenantId },
    autoConnect: false,
    reconnection: true,
  });
  return socket;
}
```

**Integración con TanStack Query (patrón TkDodo):**
```ts
export function useOrderUpdates() {
  const qc = useQueryClient();
  useEffect(() => {
    const s = getSocket(token, tenantId);
    s.connect();
    s.on('order:created', (data) => qc.invalidateQueries({ queryKey: ['orders', data.vendorId] }));
    s.on('order:status_changed', (data) => qc.setQueryData(['order', data.id], data));
    return () => { s.off('order:created'); s.off('order:status_changed'); };
  }, [qc]);
}
```

**Topología:** el socket server vive en **NestJS**, NUNCA en Next.js Route Handlers (no soportan upgrade). El cliente Next conecta directo al backend.

**Seguridad multi-tenant:** validar `tenantId` del JWT contra room en server-side. NUNCA confiar en lo que emite el cliente.

---

## 1.12 i18n

| Librería | Versión | Razón |
|---|---|---|
| `next-intl` | ^4.9.0 | Default 2026 para App Router. Traducciones en Server Components, ICU MessageFormat. |

```bash
npm install next-intl
```

**Estructura:**
```
messages/
  es.json    ← único locale en MVP
app/[locale]/
  layout.tsx
  page.tsx
i18n/
  request.ts   ← carga messages por locale
```

**Setup:**
- `defaultLocale: 'es'`, `localePrefix: 'as-needed'` (ES sin prefijo, EN con `/en`).
- **CRÍTICO:** llamar `setRequestLocale(locale)` en cada `page.tsx` y `layout.tsx`, o la ruta se vuelve dynamic silenciosamente.

---

## 1.13 Imágenes

| Componente | Decisión | Razón |
|---|---|---|
| `next/image` | Default con `loader: "default"` | Built-in, sharp preinstalado. |
| Formatos | `image/avif`, `image/webp` | Mejor compresión. |
| Blur placeholders | `plaiceholder` (build-time) o LQIP on-upload | Reduce CLS. |
| CDN externo | **NO en MVP** | Evaluar BunnyCDN ($9.50/mes) o imgproxy self-hosted cuando sature. |

**Configuración `next.config.ts`:**
```ts
images: {
  deviceSizes: [640, 768, 1024, 1280, 1536, 1920],
  imageSizes: [32, 48, 64, 96, 128, 192, 256],
  qualities: [75, 85],  // required allowlist en Next 16
  formats: ['image/avif', 'image/webp'],
  remotePatterns: [{ protocol: 'https', hostname: 'tu-cdn.com' }],
}
```

**Cambio breaking en Next 16:** `priority` → `preload`. Usar `preload` solo en la primera imagen (LCP), el resto `loading="lazy"`.

**Crítico 3G Putumayo:** `aspectRatio` en el contenedor previene CLS. El blur es polish, no fix de layout.

---

## 1.14 Mapas / Geolocalización

| Librería | Versión | Razón |
|---|---|---|
| `leaflet` | ^1.9.0 | Open source, 42KB, sin API key. |
| `react-leaflet` | ^4.2.0 | Wrapper React. |
| Nominatim (servicio OSM) | — | Geocoding gratis. Rate limit: 1 req/seg, **siempre cachear**. |

**Migrar a MapLibre GL JS solo si:** >1000 markers, clustering pesado, 3D/extrusión.

**Patrón (siempre dynamic import, ssr: false):**
```tsx
'use client';
import dynamic from 'next/dynamic';
const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });
```

**Cálculo de distancia (Haversine, suficiente para Putumayo <15km):**
```ts
function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat/2)**2 +
    Math.cos(a.lat * Math.PI/180) * Math.cos(b.lat * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}
```

---

## 1.15 Charts (dashboards admin/vendedor)

| Librería | Versión | Razón |
|---|---|---|
| `recharts` | ^3.0.0 | SVG, ~50KB tree-shaken, declarativa, RSC-friendly. |

```bash
npm install recharts
```

**Fase 2 (si necesitan geo maps/sankey/heatmap):** `echarts-for-react` con `echarts/core` tree-shaken.

---

## 1.16 Catálogo de productos (PDP)

| Librería | Versión | Razón |
|---|---|---|
| `embla-carousel-react` | ^8.6.0 | Carrusel base, ~5KB, swipe nativo mobile, dependency-free. |
| `yet-another-react-lightbox` | ^3.32.0 | Lightbox con plugins Zoom, Thumbnails, Fullscreen. |

**No usar:** `swiper.js` (80KB extra sin necesidad), `photo-sphere-viewer` (es para 360°/VR).

**Variantes en URL state** (con nuqs):
```ts
const [variantId, setVariantId] = useQueryState('variant', parseAsString.withDefault(variants[0]?.id));
// URL: /producto/zapatos?variant=red-m
```

---

# 2. CHECKOUT

**Decisión MVP:** wizard custom con Zustand + guards por step. NO usar XState en MVP (overkill para 4 steps). Agregar XState si emergen bugs de "saltar a confirmar sin haber pagado".

**Patrón:**
```ts
type CheckoutStep = 'address' | 'delivery' | 'payment' | 'review' | 'submitting' | 'success' | 'error';
type CheckoutContext = { items, address, delivery, payment, orderId, error };
// Usar Zustand para state, con guards que validan schema Zod antes de avanzar
```

**Pasos:**
1. **address** (Zod: `addressSchema`)
2. **delivery** (Zod: `deliverySchema`, costo por Haversine)
3. **payment** (MVP: comprobante de transferencia, File upload a MinIO)
4. **review** (mostrar resumen, botón confirmar)
5. **submitting** (Server Action, mostrar progress)
6. **success** / **error**

**Tiempo real:** polling con TanStack Query cada 5s al estado del pedido (`refetchInterval: 5000`). Socket.io solo en fase 2.

---

# 3. MULTI-TENANT

**Decisión:** path-based `/negocio/{slug}` en Fase 1. Subdominio `{slug}.mocoastore.alexsters.works` en Fase 2 (top 5 tiendas).

**Resolución del tenant:**
1. **`proxy.ts`**: lee `host` header, detecta slug, inyecta `x-tenant-slug` header.
2. **`app/[...slug]/layout.tsx`**: `await headers().get('x-tenant-slug')` → fetch tenant de DB → inyecta CSS vars inline en `<body>`.
3. **CSS vars** en `globals.css` con `@theme inline` referenciando las vars inyectadas.
4. **Zero JS al cliente para theming** = zero FOUC.

**Cache keys DEBEN incluir tenant:**
```ts
const products = await fetch(`${API}/products`, {
  next: { tags: [`tenant:${tenant.id}:products`] }
});
```

---

# 4. ERROR MONITORING

**Decisión:** GlitchTip 6 self-hosted en Docker (4 contenedores, 256-512 MB RAM). Mismo SDK que Sentry (`@sentry/nextjs`), DSN-based swap-out.

```bash
npm install @sentry/nextjs
```

**GlitchTip acepta el SDK de Sentry nativo** → código idéntico, migración futura = cambiar DSN.

**Setup:**
- 4 contenedores Docker: web, worker, postgres, redis.
- Cubre 90% de necesidades MVP: stack traces con source maps, alertas email/webhook, releases.
- **No tiene** session replay. Cuando se necesite → migrar a Sentry self-hosted o Highlight.io.

---

# 5. ANALYTICS

**Decisión:** Umami 2 self-host (pageviews) + PostHog Cloud free tier (eventos, funnels, session replay).

| Herramienta | Uso | Costo | RAM |
|---|---|---|---|
| **Umami 2** (self-host Docker) | Pageviews + custom events básicos | $0 | 256 MB |
| **PostHog Cloud** (free tier) | Eventos complejos, funnels, session replay | $0 hasta 1M eventos/mes, 5K replays/mes | 0 (cloud) |

**Script Umami:** 2KB, sin cookies, GDPR-safe.

**Si PostHog Cloud no es aceptable (datos no pueden salir del VPS):** migrar a PostHog self-hosted (20 servicios, 8GB RAM) en Fase 2.

---

# 6. TESTING

| Capa | Herramienta | Versión |
|---|---|---|
| Unit/Integration | Vitest 4 + React Testing Library 16 + happy-dom 15 | Latest |
| E2E | Playwright 1.55 con POM (Page Object Model) | Latest |
| Visual regression | Playwright `toHaveScreenshot()` (5-10 vistas críticas) | Incluido |
| Mocking | `vi.fn` / `vi.mock` (95% compatible con Jest API) | — |

```bash
# Unit
npm install -D vitest @vitejs/plugin-react @testing-library/react@^16 \
  @testing-library/jest-dom @testing-library/user-event@^14 happy-dom@^15

# E2E
npm install -D @playwright/test
npx playwright install
```

**Patrón Playwright:** POM + Testing Library queries (`getByRole`, `getByLabel`) → tests resilientes. NO selectores CSS/XPath.

**Critical flows E2E (max 20-40 tests):**
- Registro de tienda
- Login (OTP WhatsApp)
- Crear producto con imágenes
- Checkout completo
- Cambio de estado de pedido

**Limitación:** Vitest no soporta `async` Server Components → cubrir con Playwright E2E.

---

# 7. DX (Developer Experience)

```bash
# ESLint flat config (Next 16 eliminó next lint)
# Usar ESLint CLI directo con eslint-config-next

# Prettier
npm install -D prettier prettier-plugin-tailwindcss

# Pre-commit + conventional commits
npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init
```

**Pre-commit:** `npx lint-staged` (ESLint --fix + Prettier --write).
**Commit-msg:** `commitlint --edit "$1"`.

**Dependabot** (built-in GitHub, gratis) para PRs automáticos. Migrar a Renovate si el monorepo crece >5 paquetes agrupables.

---

# 8. PWA

**Decisión MVP:** NO. PWA en Fase 2 con Serwist v10+ (next-pwa está deprecated con Turbopack).

```bash
# Fase 2
npm install @serwist/turbopack @serwist/next
```

---

# 9. ESTADO DE DECISIONES

| Decisión | Estado | Congelada hasta |
|---|---|---|
| UI: shadcn/ui + Tailwind v4 | ✅ Confirmado | Review Q4 2026 |
| Animaciones: Motion 12.18.1 (pinned) | ✅ Confirmado | Review Q4 2026 |
| Toasts: Sonner | ✅ Confirmado | — |
| Forms: React Hook Form 7 + Zod 4 | ✅ Confirmado | — |
| Validación: Zod 4 + nestjs-zod | ✅ Confirmado | — |
| Tablas: TanStack Table v8 | ✅ Confirmado | — |
| Upload: react-dropzone + @dnd-kit + presigned MinIO | ✅ Confirmado | — |
| Date: react-day-picker 9 + date-fns | ✅ Confirmado | — |
| Search MVP: Postgres FTS + pg_trgm | ✅ Confirmado | Migrar a Meilisearch cuando >5K productos |
| Carrito: Zustand 5 + persist | ✅ Confirmado | — |
| Server state: TanStack Query v5 + RSC | ✅ Confirmado | — |
| URL state: nuqs 2.8 | ✅ Confirmado | — |
| Auth: Custom + jose | ✅ Confirmado | — |
| WebSockets: socket.io-client (server en NestJS) | ✅ Confirmado | — |
| i18n: next-intl 4 | ✅ Confirmado | — |
| Imágenes: next/image + sharp + plaiceholder | ✅ Confirmado | — |
| Mapas: Leaflet + react-leaflet | ✅ Confirmado | Migrar a MapLibre si >1000 markers |
| Charts: Recharts 3 | ✅ Confirmado | — |
| Catálogo PDP: Embla + yet-another-react-lightbox | ✅ Confirmado | — |
| Checkout: custom Zustand + Zod guards | ✅ Confirmado (MVP) | XState en Fase 2 si emergen bugs |
| Multi-tenant routing: path-based Fase 1 | ✅ Confirmado | Subdomain Fase 2 (top 5 tiendas) |
| Error monitoring: GlitchTip 6 self-host | ✅ Confirmado | Migrar a Sentry si necesitan session replay |
| Analytics: Umami + PostHog Cloud free | ✅ Confirmado | PostHog self-host en Fase 2 si datos no salen del VPS |
| Testing: Vitest + Playwright | ✅ Confirmado | — |
| PWA: NO en MVP | ✅ Confirmado | Serwist v10 en Fase 2 |
| DX: ESLint flat + Prettier + Husky + Dependabot | ✅ Confirmado | — |

---

# 10. BUDGET DE BUNDLE MVP

| Categoría | Bundle gz |
|---|---|
| Next runtime | ~70 KB |
| shadcn core (5-10 componentes usados) | ~10 KB |
| Motion lazy (gestos mobile, on-demand) | ~15 KB |
| Sonner | ~5 KB |
| React Hook Form + Zod v4-mini | ~10 KB |
| TanStack Query | ~13 KB |
| TanStack Table + Virtual | ~22 KB |
| **TOTAL cliente (catálogo público)** | **~145 KB gz** |
| Admin (carga Fuse.js + Recharts + XState) | **~210 KB gz** |

**Mitigaciones:**
- `nuqs` con `shallow: false` solo donde se necesita re-render RSC.
- `motion` con `LazyMotion` + `domAnimation` → baja ~30KB del bundle inicial.
- `Zod v4-mini` (2KB) en cliente para forms grandes.
- `date-fns` con imports por función.
- `next/dynamic` para modales, calendarios, mapas.

**Lighthouse objetivo:** catálogo público <150KB JS inicial, dashboard admin <250KB con code splitting.

---

# 11. RIESGOS Y WATCH LIST

1. **Radix Primitives `asChild` + lazy references (#3776)** — bug en prod RSC. Workaround: descomponer trigger en Client Component.

2. **Motion 12.18.2-12.23.x** — pin exacto a `12.18.1`. Validar con `next build` antes de cada deploy.

3. **`params` ahora es `Promise` en Next 16** — destructuring directo rompe. Patrón: `const { slug } = await params`.

4. **Turbopack + CSS-in-JS** — no usar librerías con Emotion (MUI, Chakra) sin EmotionRegistry manual.

5. **Multi-tenant + cache** — TODAS las cache keys (fetch, unstable_cache, nuqs) DEBEN incluir `tenantId`.

6. **Bundle size en 2G/3G** — presupuesto First Load JS <150KB por ruta en catálogo público.

7. **Zustand SSR leak** — siempre store factory + Provider + `useRef`. NUNCA `create()` global.

8. **Socket.io HMR** — singleton module-level + cleanup riguroso en `useEffect` return.

9. **Vendedor lock-in de OKLCH** — shadcn 2.3+ y Tailwind v4 lo adoptaron. Mitigación: mapping OKLCH → HEX en design system docs.

10. **GlitchTip sin session replay** — aceptable en MVP. Migrar a Sentry/Highlight.io cuando se necesite.

---

# 12. COMANDOS DE INSTALACIÓN (referencia)

```bash
# UI / Estilos
npm install tailwindcss @tailwindcss/postcss postcss  # dev
npm install lucide-react class-variance-authority clsx tailwind-merge next-themes
npx shadcn@canary init

# Animaciones
npm install motion@12.18.1
npm install @formkit/auto-animate

# Toasts
npx shadcn@canary add sonner

# Forms + Validación
npm install react-hook-form @hookform/resolvers zod

# Tablas
npm install @tanstack/react-table @tanstack/react-virtual

# Upload
npm install react-dropzone @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Date
npm install react-day-picker date-fns
npx shadcn@canary add calendar

# Search (cliente)
npm install fuse.js

# Estado
npm install zustand @tanstack/react-query @tanstack/react-query-devtools nuqs

# Auth
npm install jose

# WebSockets
npm install socket.io-client

# i18n
npm install next-intl

# Mapas
npm install leaflet react-leaflet
npm install -D @types/leaflet

# Charts
npm install recharts

# Catálogo PDP
npm install embla-carousel-react
npm install yet-another-react-lightbox

# Error monitoring
npm install @sentry/nextjs

# Testing
npm install -D vitest @vitejs/plugin-react @testing-library/react@^16 \
  @testing-library/jest-dom @testing-library/user-event@^14 happy-dom@^15
npm install -D @playwright/test
npx playwright install

# DX
npm install -D prettier prettier-plugin-tailwindcss
npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init
```

**Bundle total estimado tras instalación:** ~145 KB gz (catálogo), ~210 KB gz (admin).

---

# 13. CHECKLIST PARA IAs

Antes de proponer un componente frontend, una IA debe:

- [ ] Leer este documento completo.
- [ ] Verificar que la librería propuesta no está en la lista de "NO usar".
- [ ] Si propone una nueva dependencia, justificar bundle trade-off.
- [ ] Si toca CSS, usar `@theme inline` con OKLCH.
- [ ] Si toca forms, usar React Hook Form + Zod (no Formik, no Yup, no Joi).
- [ ] Si toca estado, decidir URL/server/UI/local según la regla mental.
- [ ] Si toca auth, validar contra el JWT del backend NestJS (no auth nueva).
- [ ] Si toca multi-tenant, TODA query/acción DEBE filtrar por `tenantId`.
- [ ] Si toca cache, keys con prefijo `tenant:{id}:`.
- [ ] Si toca tiempo real, usar socket.io-client (server en NestJS, no en Next).
- [ ] Si toca subida de archivos, patrón 3 pasos con presigned URLs a MinIO.
- [ ] Validar con `npm run typecheck` y `npm run lint` antes de declarar listo.
- [ ] Validar `npm run build` para detectar bugs que solo aparecen en producción (Radix #3776, Motion 12.18.2+).

---

# 14. CHANGELOG

- **2026-06-05**: Creación inicial con 27 decisiones. Investigación de 5 agentes paralelos. Decisiones clave: RHF + Zod, GlitchTip, Umami + PostHog.
