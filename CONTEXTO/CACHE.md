# CACHE.md

# OBJETIVO

Definir la estrategia de cache de Mocoa Market.

Alcance:

- Qué se cachea.
- Qué NO se cachea.
- TTL por tipo.
- Invalidación.
- Keys y prefijos.
- Multi-tenant.
- Monitoreo.

Detalle de multi-tenant: [[MULTI_TENANT.md]].

Detalle de WebSockets: [[WEBSOCKETS.md]].

---

# DECISIÓN ARQUITECTÓNICA

- **Redis** como cache principal.
- Patrón: **Cache-Aside (lazy loading)**.
- Serialización: JSON.
- Keys con prefijo `tenant:{tenantId}:` para aislamiento.
- Invalidación activa en mutaciones.

Razones:

- Patrón simple, ampliamente conocido.
- El desarrollador tiene control total.
- Compatible con stack actual (Redis obligatorio).
- Migrable a Read replicas en fase 3.

---

# CLIENTE DE CACHE

```typescript
@Injectable()
export class CacheService {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const valueStr = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.set(key, valueStr, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, valueStr);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) await this.redis.del(keys);
  }
}
```

---

# CONVENCIONES DE KEYS

Prefijos obligatorios:

- `tenant:{tenantId}:{recurso}:{opción}`

Ejemplos:

```
tenant:abc123:products:list:cat=zapatos:page=1
tenant:abc123:product:xyz789
tenant:abc123:dashboard:metrics
tenant:abc123:user:u123:permissions
```

Globales (sin tenant, evitar):

```
system:plans:list
system:roles:list
```

Sesiones:

```
session:user:u123 → { refreshTokenHash, expiresAt, ... }
auth:failed-logins:ip:1.2.3.4 → 3 (contador, TTL 15min)
auth:failed-logins:user:u123 → 2 (contador, TTL 15min)
```

WebSockets / presencia:

```
presence:tenant:abc123:user:u123 → { estado, lastSeen } (TTL 60s)
```

Idempotencia:

```
idempotency:{uuid} → { response, statusCode } (TTL 24h)
```

Rate limiting:

```
rl:user:u123:/api/v1/sales → 23 (TTL ventana)
rl:ip:1.2.3.4:/auth/login → 2 (TTL 15min)
```

---

# QUÉ SE CACHEA

## Productos y catálogo

| Recurso | Key | TTL | Invalidar en |
|---------|-----|-----|--------------|
| Lista de productos | `tenant:{id}:products:list:{filtros}` | 5 min | create, update, delete, stock change |
| Producto individual | `tenant:{id}:product:{id}` | 10 min | update, delete |
| Categorías | `tenant:{id}:categories:tree` | 30 min | CRUD categorías |
| Productos destacados | `tenant:{id}:products:featured` | 15 min | update destacado |
| Búsqueda popular | `tenant:{id}:search:{q}` | 10 min | update producto |

## Marketplace público

| Recurso | Key | TTL | Invalidar en |
|---------|-----|-----|--------------|
| Negocio público | `public:tenant:{slug}:info` | 30 min | update settings |
| Catálogo público | `public:tenant:{slug}:products` | 5 min | cambios de stock, update producto |
| Categorías públicas | `public:tenant:{slug}:categories` | 30 min | CRUD categorías |
| Negocios destacados | `public:marketplace:featured` | 10 min | update featured |
| Búsqueda global | `public:search:{q}` | 5 min | N/A (TTL) |

## Configuración

| Recurso | Key | TTL | Invalidar en |
|---------|-----|-----|--------------|
| Settings del tenant | `tenant:{id}:settings` | 1h | update settings |
| Delivery config | `tenant:{id}:delivery-config` | 1h | update config |
| Permisos del usuario | `tenant:{id}:user:{uid}:permissions` | 5 min | update role |

## Reportes

| Recurso | Key | TTL | Invalidar en |
|---------|-----|-----|--------------|
| Dashboard principal | `tenant:{id}:dashboard:main` | 1 min | eventos críticos |
| Reporte ventas mes | `tenant:{id}:report:sales:{yyyymm}` | 1h | nueva venta |
| Inventario valorizado | `tenant:{id}:report:inventory` | 15 min | stock change |

## Sesiones y auth

| Recurso | Key | TTL | Invalidar en |
|---------|-----|-----|--------------|
| Sesión de usuario | `session:user:{uid}` | 7d | logout, password change |
| Refresh token (validación rápida) | `refresh:{jti}` | 7d | revoke |
| Intentos login fallidos | `auth:failed-logins:*` | 15 min | éxito login |

---

# QUÉ NO SE CACHEA

- **Datos altamente transaccionales en operaciones críticas**: el stock durante una venta (se lee directo de DB con row lock).
- **Datos personales sensibles**: nada de PII en cache de larga duración.
- **Resultados de reportes en tiempo real**: deben ser frescos.
- **Listados de auditoría**: siempre lectura directa.
- **Búsquedas con muchos filtros variables**: cuesta mantener cache, TTL corto.
- **Datos con consistencia eventual inaceptable**.

---

# PATRÓN CACHE-ASIDE

```typescript
async getProducts(tenantId: string, filters: any) {
  const key = `tenant:${tenantId}:products:list:${JSON.stringify(filters)}`;

  // 1. Intentar cache
  const cached = await this.cacheService.get(key);
  if (cached) return cached;

  // 2. Si no, consultar DB
  const products = await this.prisma.product.findMany({ where: filters });

  // 3. Guardar en cache
  await this.cacheService.set(key, products, 300); // 5 min

  return products;
}
```

## Invalidación en mutación

```typescript
async updateProduct(tenantId: string, id: string, data: UpdateProductDto) {
  const updated = await this.prisma.product.update({ where: { id }, data });

  // Invalidar cache relacionado
  await this.cacheService.del(`tenant:${tenantId}:product:${id}`);
  await this.cacheService.delPattern(`tenant:${tenantId}:products:list:*`);
  await this.cacheService.delPattern(`public:tenant:*:products:*`);

  return updated;
}
```

---

# INVALIDACIÓN

## Tipos

- **Directa (DEL)**: cuando se conoce la key exacta.
- **Por patrón (DEL pattern)**: cuando hay muchas keys relacionadas.
- **Por versión (key versioning)**: se incluye un `version` en la key y se incrementa.

## Estrategia recomendada

- Mutaciones invalidan TODAS las keys de listado del recurso.
- Mutaciones invalidan la key individual.
- Cambios en categorías invalidan productos con esa categoría.
- Cambios de stock invalidan listas de productos y reportes.
- Cambios de settings invalidan caches de settings.

## En transacciones

La invalidación se hace DESPUÉS de commitear la transacción (no antes, para evitar invalidar si falla).

```typescript
const result = await prisma.$transaction(async (tx) => { ... });
await this.invalidateCache(tenantId, ...);
return result;
```

---

# CACHE DE SESIONES

Alternativa a JWT stateful total.

```typescript
async createSession(userId: string, refreshToken: string) {
  await this.cacheService.set(
    `session:user:${userId}`,
    { refreshTokenHash: sha256(refreshToken), jti, lastIp },
    604800 // 7 días
  );
}

async validateSession(userId: string, refreshToken: string) {
  const session = await this.cacheService.get(`session:user:${userId}`);
  if (!session) return null;
  if (session.refreshTokenHash !== sha256(refreshToken)) return null;
  return session;
}
```

Beneficio: revocación inmediata (logout = `del session:user:{id}`).

Costo: una consulta Redis por cada refresh.

---

# PROTECCIÓN CONTRA CACHE STAMPEDE

Cuando una key expira y muchos requests la piden simultáneamente, todos golpean la DB a la vez.

Mitigación: lock distribuido.

```typescript
async getProducts(key: string) {
  const cached = await this.cacheService.get(key);
  if (cached) return cached;

  // Lock: solo el primero consulta DB
  const lockKey = `lock:${key}`;
  const acquired = await this.redis.set(lockKey, '1', 'EX', 10, 'NX');

  if (!acquired) {
    // Otros esperan un poco y vuelven a intentar cache
    await this.sleep(50);
    return this.getProducts(key); // reintento
  }

  try {
    const fresh = await this.prisma.product.findMany();
    await this.cacheService.set(key, fresh, 300);
    return fresh;
  } finally {
    await this.redis.del(lockKey);
  }
}
```

---

# MONITOREO

Métricas:

- `cache.hit` / `cache.miss` por recurso.
- `cache.invalidation` por recurso.
- `cache.size` por prefijo.
- `cache.latency` p50, p95, p99.

Comando Redis para inspeccionar:

```bash
redis-cli INFO memory
redis-cli --scan --pattern 'tenant:*' | wc -l
redis-cli SLOWLOG GET 10
```

Alertas:

- Hit ratio < 70% en producción.
- Latencia p95 > 10ms.
- Memoria Redis > 80% del límite.

Detalle: [[MONITOREO.md]].

---

# TAMAÑO Y LÍMITES

- Tamaño máximo por valor: 1MB (recomendado < 100KB).
- Para objetos grandes, considerar:
  - Dividir en múltiples keys.
  - Comprimir con gzip.
  - Guardar en MinIO y cachear solo la URL.

Configuración Redis:

- `maxmemory-policy: allkeys-lru` (eviction LRU).
- `maxmemory: 256mb` (ajustar según VPS).

---

# BACKUP Y PERSISTENCIA

- Redis se configura con AOF (Append Only File) para durabilidad.
- AOF se rota diariamente.
- Backup completo de Redis cada 6 horas (dump + AOF).
- La pérdida de cache no es crítica (se regenera).

Detalle: [[BACKUPS.md]].

---

# EVENTOS RELACIONADOS

- `cache.invalidated`
- `cache.miss.stampede.detected`
- `cache.size.exceeded`

Detalle: [[EVENTOS.md]].

---

# REGLAS CRÍTICAS

- Toda key de cache de tenant lleva `tenant:{id}:`.
- Toda key de cache global lleva `system:` o `public:`.
- Ningún dato personal sensible se cachea sin cifrar.
- Ningún valor cacheado excede 1MB.
- Toda mutación invalida cache relacionado.
- Invalidación ocurre DESPUÉS del commit (no antes).
- Si Redis cae, la app sigue funcionando (degradación elegante: leer directo de DB).
- TTL siempre explícito (nunca cachear sin expiración).
- Las claves de idempotencia usan UUID v4 (no derivadas de timestamp).
