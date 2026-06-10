# ARQUITECTURA.md

# OBJETIVO

Definir la arquitectura técnica completa del sistema Mocoa Market.

Este documento es la fuente de verdad para:

- Decisiones de arquitectura.
- Patrones de diseño.
- Capas del sistema.
- Comunicación entre servicios.
- Reglas de implementación.

Cualquier desarrollo debe respetar lo aquí definido.

Detalle ejecutivo: [[CONTEXTO_GLOBAL.md]].

---

# ESTILO ARQUITECTÓNICO

## Backend: Modular Monolith

El backend se construye como un monolito modular sobre NestJS.

Razones:

- Una sola unidad de despliegue (reduce costos en VPS pequeño).
- Módulos internos desacoplados por contratos (interfaces) y eventos.
- Permite migrar a microservicios en el futuro sin reescritura total.

Reglas:

- Cada módulo expone servicios públicos y mantiene privados los detalles internos.
- La comunicación entre módulos se hace por:
  1. Inyección de servicios (casos directos).
  2. Bus de eventos (casos desacoplados).
- Ningún módulo accede directamente a la base de datos de otro módulo.

## Frontend: App Router con módulos

Next.js con App Router y agrupación por módulos funcionales.

Cada módulo frontend:

- Tiene su propia carpeta en `frontend/src/modules/{nombre}`.
- Encapsula páginas, componentes, hooks y servicios.
- Se comunica con el backend solo por `services/`.
- Comparte `components/ui` y `components/shared`.

## Persistencia: Shared DB Multi-tenant

PostgreSQL único compartido entre tenants.

Aislamiento por columna `tenant_id` en todas las tablas comerciales.

Detalle: [[MULTI_TENANT.md]].

---

# CAPAS DEL SISTEMA

```
┌─────────────────────────────────────────────┐
│  CAPA 1: Presentación                       │
│  Next.js (App Router)                       │
│  - Server Components                         │
│  - Client Components                         │
│  - Rutas públicas y protegidas               │
│  - Server Actions para mutaciones            │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  CAPA 2: API Gateway                        │
│  Nginx                                      │
│  - SSL termination                           │
│  - Routing                                   │
│  - Rate limiting básico                      │
│  - Compresión                                │
│  - Caché estático                            │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  CAPA 3: Aplicación                         │
│  NestJS                                     │
│  - Controllers (REST)                        │
│  - Services (lógica de negocio)              │
│  - Repositories (acceso a datos)             │
│  - Guards (autenticación/autorización)       │
│  - Interceptors (logging, transformación)    │
│  - Filters (manejo de errores)               │
│  - Pipes (validación)                        │
│  - Events (pub/sub interno)                  │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  CAPA 4: Dominio                            │
│  Servicios de dominio                       │
│  - InventoryService                          │
│  - PosService                                │
│  - OrderService                              │
│  - CustomerService                           │
│  - etc.                                      │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  CAPA 5: Persistencia                       │
│  Prisma ORM                                 │
│  - Migrations                                │
│  - Transactions                              │
│  - Type-safe queries                         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  CAPA 6: Datos                              │
│  - PostgreSQL + PostGIS (datos)              │
│  - Redis (caché, sesiones, WS, colas)        │
│  - MinIO (archivos)                          │
└─────────────────────────────────────────────┘
```

---

# PATRONES DE DISEÑO APLICADOS

## Repository Pattern

Cada módulo backend encapsula el acceso a datos en una capa Repository.

```
Controller → Service → Repository → Prisma → DB
```

Beneficio: cambiar el ORM o agregar cache no impacta la lógica de negocio.

## Service Layer

Toda lógica de negocio vive en Services.

Controllers solo enrutan y validan entrada.

## Event-Driven entre módulos

Módulos desacoplados publican y escuchan eventos en el bus interno.

Ejemplo:

```
VentasService.publicar(VentaRealizadaEvent)
  ↓
EventBus (Redis Pub/Sub o BullMQ)
  ↓
InventarioListener.actualizarStock()
ReportesListener.actualizarMetricas()
CrmListener.asignarPuntos()
```

## CQRS ligero

Para reportes y consultas complejas se puede separar la lectura de la escritura, aunque no es obligatorio en MVP.

## Strategy para integraciones

Integraciones externas (WhatsApp, email, mapas) detrás de interfaces para poder cambiar de proveedor.

## Guard + Decorator para permisos

```typescript
@Roles('ADMIN_NEGOCIO', 'SUPERVISOR')
@UseGuards(JwtAuthGuard, RolesGuard)
```

Detalle: [[AUTH.md]] y [[RBAC.md]].

---

# COMUNICACIÓN

## Frontend → Backend

- REST/JSON sobre HTTPS.
- Versionado por URL: `/api/v1/...`.
- Autenticación: Bearer token en header.
- Idempotencia en operaciones críticas vía header `Idempotency-Key`.

Detalle: [[API.md]].

## Backend → Workers

- BullMQ sobre Redis.
- Jobs asíncronos: generación de reportes, envío de notificaciones, thumbnails de imágenes, etc.

## Backend → WebSockets

- Socket.io sobre Redis Adapter.
- Canales por tenant y por recurso.
- Autenticación por token JWT en handshake.

Detalle: [[WEBSOCKETS.md]].

## Backend → PostgreSQL

- Prisma ORM.
- Transacciones para operaciones que tocan múltiples tablas.
- Migraciones versionadas.
- Índices en toda FK y todo campo de búsqueda frecuente.

## Backend → Redis

- Caché de lectura.
- Sesiones (si se decide este approach).
- Locks distribuidos (para jobs críticos).
- Rate limiting.

Detalle: [[CACHE.md]].

## Backend → MinIO

- SDK AWS S3 (compatible).
- URLs prefirmadas para upload directo desde el cliente (optimización futura).
- Buckets separados por tipo: productos, comprobantes, facturas, etc.

## Backend → Servicios externos

Detrás de interfaces (Strategy pattern):

- WhatsApp Business API.
- Email transaccional.
- Pasarela de pagos (cuando se integre).
- Proveedor de mapas.

Detalle: [[INTEGRACIONES.md]].

---

# GESTIÓN DE TRANSACCIONES

Toda operación que modifica múltiples tablas debe ejecutarse en una transacción Prisma.

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Validar stock
  // 2. Crear SALE
  // 3. Crear SALE_ITEMS
  // 4. Crear INVENTORY_MOVEMENTS
  // 5. Actualizar PRODUCTS.stock
  // 6. Crear CASH_MOVEMENTS
  // 7. Crear AUDIT_LOG
});
```

Reglas:

- Transacciones cortas y determinísticas.
- Evitar llamadas externas dentro de transacciones (HTTP, email, etc.).
- Si hay operaciones async después de la transacción, encolarlas en BullMQ.

---

# EVENTOS DE DOMINIO

Detalle completo: [[EVENTOS.md]].

El sistema usa un bus de eventos interno basado en Redis Pub/Sub + BullMQ.

Pub/Sub: para notificaciones en tiempo real (WebSockets).

BullMQ: para jobs diferidos y resilientes.

Los eventos se definen como clases TypeScript inmutables:

```typescript
export class VentaRealizadaEvent {
  static readonly NAME = 'venta.realizada';
  constructor(
    public readonly tenantId: string,
    public readonly saleId: string,
    public readonly total: number,
    public readonly fecha: Date,
  ) {}
}
```

---

# GESTIÓN DE ERRORES

## Capa HTTP

Formato estándar de respuesta de error:

```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": "El campo X es obligatorio",
  "details": { ... },
  "timestamp": "2026-06-05T...",
  "path": "/api/v1/sales"
}
```

## Capa de Dominio

- Excepciones tipadas (`DomainException`, `NotFoundException`, `BusinessRuleException`).
- Mapeadas a HTTP por un `ExceptionFilter` global.

## Logging

- Toda excepción se loguea con stack trace.
- Nivel ERROR con contexto completo.
- Sin filtrar datos sensibles (PII, contraseñas, tokens).

Detalle: [[LOGGING.md]].

---

# SEGURIDAD EN CAPAS

Detalle completo: [[SEGURIDAD.md]].

1. **Transporte:** HTTPS obligatorio, HSTS habilitado.
2. **Aplicación:**
   - Helmet headers.
   - CORS estricto.
   - Rate limiting por IP y por tenant.
   - Validación de entrada con class-validator.
3. **Autenticación:** JWT con access + refresh.
4. **Autorización:** Guards de rol y recurso.
5. **Datos:**
   - Contraseñas hasheadas con bcrypt (cost >= 12).
   - Datos sensibles cifrados en reposo (futuro).
   - Multi-tenant siempre filtrado por `tenant_id`.
6. **Auditoría:** Toda acción crítica registra en `AUDIT_LOGS`.

---

# ESCALABILIDAD

Detalle completo: [[INFRAESTRUCTURA.md]].

## Fase 1 — MVP (actual)

- 1 VPS Contabo.
- Todos los servicios en Docker Compose.
- Sin separación de workers.

## Fase 2 — Crecimiento

- 2 VPS: app + datos.
- Redis separado.
- Backups automatizados.

## Fase 3 — Escala

- Cluster de VPS.
- Separación de workers.
- Réplicas de lectura Postgres.
- Migración a Kubernetes (si métricas lo justifican).

Reglas para escalar:

- Escalar por métricas reales, no por previsión.
- Mantener compatibilidad con stack actual.
- No introducir servicios cloud pagos en fase temprana.

---

# DESPLIEGUE

Detalle completo: [[DEPLOYMENT.md]] y [[CI_CD.md]].

## Flujo

```
Push a branch
  ↓
CI: lint + tests + build
  ↓
Merge a main
  ↓
CI: build de imágenes Docker
  ↓
Push a registry (Docker Hub o privado)
  ↓
CD: SSH al VPS + docker compose pull + restart
```

## Estrategia

- Rolling deployment (sin downtime).
- Backups previos a cada deploy.
- Rollback inmediato si health check falla.

---

# OBSERVABILIDAD

Detalle completo: [[MONITOREO.md]] y [[LOGGING.md]].

## Logs

- Estructurados en JSON.
- Niveles: DEBUG, INFO, WARN, ERROR.
- Centralizados en volumen Docker y rotación diaria.

## Métricas

- Endpoint `/metrics` Prometheus.
- CPU, RAM, disco, red.
- Métricas de aplicación: requests/min, latencia p95, errores.

## Alertas

- Uptime del servicio.
- Disco > 80%.
- Error rate > 5%.
- Latencia p95 > 2s.

## Health checks

- `/health` retorna estado de DB, Redis, MinIO.
- Consumido por Nginx y Docker.

---

# CONVENCIONES DE CÓDIGO

Detalle: [[REGLAS_IA.md]] y [[ESTRUCTURA.md]].

- TypeScript estricto.
- ESLint + Prettier.
- Commits con prefijo: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- No hay `any` salvo justificación comentada.
- No hay SQL crudo salvo migración o query extrema.
- Prisma como única fuente de queries.

---

# DECISIONES DE ARQUITECTURA (ADR ligero)

Las decisiones importantes se documentan en el archivo correspondiente.

Si una decisión contradice este documento, debe:

1. Crear ADR en este mismo documento.
2. Actualizar la sección afectada.
3. Justificar el cambio.

---

# PRINCIPIOS

1. **Simplicidad operativa.** Optimizar para 1-2 ingenieros.
2. **Bajo costo.** Stack que se mantenga bajo USD 40/mes en MVP.
3. **Modularidad.** Cada componente puede reemplazarse sin reescritura.
4. **Observabilidad.** Todo es medible y logueable.
5. **Documentación viva.** La arquitectura se actualiza con el sistema.

---

# REGLAS CRÍTICAS

- Ningún módulo accede directamente a la DB de otro.
- Ninguna mutación de producto se hace sin evento.
- Ningún tenant puede ver datos de otro.
- Ningún secreto se hardcodea.
- Ninguna operación crítica queda sin auditoría.
- Ningún cambio de stack sin ADR documentado.
