# MULTI_TENANT.md

# OBJETIVO

Definir la estrategia de aislamiento multi-tenant de Mocoa Market.

Alcance:

- Modelo de aislamiento.
- Identificación de tenant.
- Filtrado en cada capa.
- Onboarding de nuevos tenants.
- Impersonación de SUPER_ADMIN.
- Migración futura a esquemas aislados.

---

# DECISIÓN ARQUITECTÓNICA

Estrategia adoptada: **Shared Database con columna tenant_id (discriminator column)**.

Razones:

- Mínimo costo operativo (1 DB, 1 conexión, 1 backup).
- Mantenimiento simple (1 schema, migraciones únicas).
- Suficiente para Fase 1-3 (hasta ~10.000 tenants).
- Compatible con stack actual (Postgres + Prisma).

Riesgos aceptados:

- Un bug en filtrado expone datos cross-tenant. Mitigación: Prisma middleware + tests estrictos + auditoría.
- Toda la DB se afecta por una sola caída. Mitigación: backups diarios y réplicas de lectura en fase 3.

Ruta de migración:

- Si un tenant enterprise requiere aislamiento, se puede migrar a schema-per-tenant sin reescritura gracias al Prisma client multi-schema.

---

# MODELO DE DATOS

Fuente: [[Modelo Datos.md]].

## Regla absoluta

Toda entidad con datos de un negocio incluye `tenant_id`:

- PRODUCTS
- CATEGORIES
- CUSTOMERS
- SALES
- ORDERS
- INVENTORY_MOVEMENTS
- CASH_REGISTERS
- EXPENSES
- BUSINESS_SETTINGS
- USERS (excepto SUPER_ADMIN)
- (y todas las demás excepto catálogo global)

## Catálogos globales (sin tenant_id)

- ROLES
- PLANS

## Tabla pivote

Las tablas pivote (ej. PRODUCT_SUPPLIER, STOCK_RESERVATIONS) heredan `tenant_id` aunque ya tengan FKs que lo contengan. Esto es redundante pero defensivo.

---

# IDENTIFICACIÓN DE TENANT

## Subdominio (opcional, fase 2)

`{slug}.mocoastore.alexsters.works`

Hoy: ruta `mocoastore.alexsters.works/negocio/{slug}`.

## Header

`X-Tenant-Id` en todas las peticiones que no son del marketplace.

## Token

`tenantId` claim del JWT.

## Resolución

Orden de prioridad:

1. Token (más confiable).
2. Header.
3. Subdominio.
4. Slug en path.

Nunca confiar solo en el cliente. El backend valida que el `tenantId` del token coincida con el `tenantId` del recurso.

---

# PRISMA MIDDLEWARE

Se implementa un middleware Prisma que:

```typescript
prisma.$use(async (params, next) => {
  // Inyectar tenant_id en CREATE
  if (params.action === 'create' || params.action === 'createMany') {
    params.args.data.tenantId = getCurrentTenantId();
  }
  // Filtrar en FIND, UPDATE, DELETE, COUNT
  if (['findUnique','findFirst','findMany','update','updateMany','delete','deleteMany','count','aggregate'].includes(params.action)) {
    params.args.where = { ...params.args.where, tenantId: getCurrentTenantId() };
  }
  return next(params);
});
```

## Modelos excluidos del filtro

- TENANTS
- USERS (filtrado especial: solo del tenant actual o is_super_admin)
- ROLES
- PLANS
- SUBSCRIPTIONS (filtrado especial por tenant)

## SUPER_ADMIN bypass

Si el contexto indica `isSuperAdmin = true` y NO está impersonando, el middleware NO filtra (permite ver agregados).

Si está impersonando, filtra por el `tenantId` impersonado.

---

# SERVICIO TENANT CONTEXT

```typescript
@Injectable()
export class TenantContextService {
  private currentTenant: string | null = null;
  private isImpersonating: boolean = false;

  set(tenantId: string, impersonated: boolean = false) { ... }
  get(): string { ... }
  isSuperAdmin(): boolean { ... }
  clear() { ... }
}
```

Poblado por:

- JwtAuthGuard (extrae del JWT).
- ImpersonationGuard (sobreescribe en impersonación).

Accesible vía:

- Inyección en services.
- AsyncLocalStorage (para jobs en background).

---

# AISLAMIENTO EN CACHÉ (REDIS)

Toda clave de cache lleva `tenant:{tenantId}:` como prefijo.

```typescript
const key = `tenant:${tenantContext.get()}:products:list`;
```

Esto evita fugas cross-tenant incluso en casos de error.

Detalle: [[CACHE.md]].

---

# AISLAMIENTO EN STORAGE (MINIO)

Cada tenant tiene un prefijo en el bucket:

```
productos/{tenantId}/producto-123/img1.jpg
comprobantes/{tenantId}/2026/06/05/comp-456.jpg
facturas/{tenantId}/2026/06/05/fact-789.pdf
```

Las URLs prefirmadas se generan con el path completo.

---

# AISLAMIENTO EN WEBSOCKETS

Conexión WS identifica tenant en handshake:

```typescript
socket.handshake.auth = { token: 'jwt...' };
// Backend extrae tenantId del JWT
// socket.join(`tenant:${tenantId}`);
// Mensajes solo se emiten a la room del tenant.
```

Detalle: [[WEBSOCKETS.md]].

---

# AISLAMIENTO EN COLAS (BULLMQ)

Cada job incluye `tenantId` en sus datos.

Workers validan `tenantId` antes de procesar.

Queues nombradas con prefijo de tenant cuando aplique, o queue global con `tenantId` interno (preferido).

---

# ONBOARDING DE NUEVO TENANT

```
SUPER_ADMIN o formulario público /signup
  ↓
Backend crea TENANT (estado=PENDIENTE)
  ↓
Crea SUBSCRIPTION (plan=EMPRENDEDOR trial 14 días)
  ↓
Crea primer ADMIN_NEGOCIO (USERS con tenant_id)
  ↓
Crea BUSINESS_SETTINGS defaults
  ↓
Crea DELIVERY_CONFIG defaults
  ↓
Crea categorías iniciales (vacías)
  ↓
Email de bienvenida + link de activación
  ↓
TENANT.estado = ACTIVO
  ↓
Auditoría: TENANT_CREADO
```

## Auto-registro público

Si se permite `/signup` público (Fase 2):

- Validar email único.
- Validar slug único (case insensitive, kebab-case).
- Generar subdominio.
- Trial 14 días del plan EMPRENDEDOR.
- KYC mínimo (teléfono, RUT opcional).

---

# ESTADOS DEL TENANT

- `PENDIENTE`: creado, no activado.
- `ACTIVO`: operativo.
- `SUSPENDIDO`: bloqueado por la plataforma (pago vencido, abuse, solicitud).
- `CANCELADO`: dado de baja, datos archivados.

Transiciones:

```
PENDIENTE → ACTIVO (al completar onboarding)
ACTIVO → SUSPENDIDO (pago, manual)
SUSPENDIDO → ACTIVO (regularización)
ACTIVO → CANCELADO (voluntario)
SUSPENDIDO → CANCELADO (tras 30 días)
```

Al cancelar:

- Los datos persisten (no se borran).
- Acceso solo de lectura para ADMIN_NEGOCIO.
- SUPER_ADMIN puede reactivar.

---

# LIMITES POR PLAN

Cada `PLANS` define:

- `limite_usuarios`
- `limite_productos`
- `almacenamiento_gb`
- (futuro: limite_pedidos_mes, limite_sucursales)

Validaciones en backend:

- Antes de crear usuario: `count(users) < limite_usuarios`.
- Antes de crear producto: `count(products) < limite_productos`.
- Antes de subir archivo: `storage_usado < almacenamiento_gb`.

Si se excede, el servicio retorna `PLAN_LIMIT_EXCEEDED` y la UI muestra upsell.

---

# SUPER_ADMIN Y CROSS-TENANT

Detalle: [[AUTH.md]] y [[RBAC.md]].

Reglas clave:

- SUPER_ADMIN no accede a datos de tenant sin impersonar.
- Durante impersonación, todo se filtra por el tenant impersonado.
- Toda operación cross-tenant se audita con `impersonated_by`.

---

# BACKUP Y RECUPERACIÓN

Detalle: [[BACKUPS.md]].

- Backups diarios de toda la DB (incluye todos los tenants).
- Restauración selectiva no es trivial (es toda la DB).
- Si se requiere restaurar datos de un tenant específico, se hace por extracción de filas.

---

# TESTING MULTI-TENANT

Estrategia de tests:

- Cada test crea 2 tenants (A y B).
- Crea datos en A.
- Verifica que queries de A no retornan datos de B.
- Verifica que queries de B no retornan datos de A.
- Test específico: `cross-tenant-isolation.spec.ts` que cubre todas las entidades.

---

# MIGRACIÓN FUTURA A SCHEMA-PER-TENANT

Si se requiere en fase enterprise:

1. Cambiar Prisma para multi-schema.
2. Migrar datos: crear schema por tenant, copiar datos.
3. Router middleware que resuelve schema según `tenantId`.
4. Migraciones se aplican a todos los schemas.
5. Backups por schema.

Esta migración es posible sin reescritura gracias al diseño desacoplado.

---

# EVENTOS RELACIONADOS

- TENANT_CREADO
- TENANT_ACTIVADO
- TENANT_SUSPENDIDO
- TENANT_REACTIVADO
- TENANT_CANCELADO
- PLAN_CAMBIADO
- LIMITE_EXCEDIDO
- IMPERSONATION_INICIADA
- IMPERSONATION_FINALIZADA

Detalle: [[EVENTOS.md]].

---

# REGLAS CRÍTICAS

- Ninguna query a una tabla con `tenant_id` puede ejecutarse sin filtro.
- El middleware Prisma es OBLIGATORIO, no opcional.
- Ningún endpoint queda sin `JwtAuthGuard` y `TenantGuard`.
- Las claves de Redis SIEMPRE llevan `tenant:{id}:`.
- Los paths de MinIO SIEMPRE llevan `tenantId` como segmento.
- SUPER_ADMIN sin impersonación nunca toca datos de tenant.
- Toda migración se prueba primero en staging con datos de múltiples tenants.
- Toda nueva entidad con datos comerciales DEBE incluir `tenant_id` desde el día 1.
