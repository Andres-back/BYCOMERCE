# API.md

# OBJETIVO

Definir los contratos REST de Mocoa Market.

Alcance:

- Convenciones de URL.
- Versionado.
- Formato de request y response.
- Manejo de errores.
- Paginación.
- Filtros y ordenamiento.
- Idempotencia.
- Rate limiting.
- Autenticación en headers.
- Catálogo de endpoints.

Detalle de auth: [[AUTH.md]].

Detalle de multi-tenant: [[MULTI_TENANT.md]].

Detalle de eventos: [[EVENTOS.md]].

---

# URL BASE

```
Producción: https://mocoastore.alexsters.works/api/v1
Desarrollo: http://localhost:3000/api/v1
```

Todas las rutas de API (excepto las explícitamente públicas) requieren autenticación y filtrado por tenant.

Detalle de dominio: [[eviroments.md]].

---

# VERSIONADO

Estrategia: **Versionado en URL**.

```
/api/v1/...
/api/v2/... (futuro)
```

Reglas:

- La versión actual es `v1`.
- Cambios compatibles (aditivos) no requieren nueva versión.
- Cambios incompatibles (eliminar campo, cambiar tipo, cambiar semántica) requieren `v2`.
- Las versiones anteriores se mantienen activas por al menos 6 meses tras el deprecation.
- Header `Sunset` indica fecha de deprecation.

---

# CONVENCIONES

## Recursos

- Sustantivos en plural, kebab-case.
- Sin verbos en URL.
- Sub-recursos anidados cuando hay relación 1:N fuerte.

```
GET    /api/v1/products
GET    /api/v1/products/:id
POST   /api/v1/products
PATCH  /api/v1/products/:id
DELETE /api/v1/products/:id

GET    /api/v1/products/:id/variants
POST   /api/v1/products/:id/variants

GET    /api/v1/categories
```

## Acciones no-CRUD

Para acciones que no encajan en CRUD, usar sub-ruta con verbo:

```
POST   /api/v1/sales/:id/void
POST   /api/v1/sales/:id/refund
POST   /api/v1/orders/:id/confirm
POST   /api/v1/orders/:id/cancel
POST   /api/v1/cash-registers/:id/open
POST   /api/v1/cash-registers/:id/close
```

## Métodos HTTP

- `GET`: lectura (idempotente, cacheable).
- `POST`: creación.
- `PATCH`: actualización parcial.
- `PUT`: actualización completa (rara vez usado).
- `DELETE`: eliminación (soft delete por defecto).

## Status codes

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Created |
| 204 | No Content (DELETE) |
| 400 | Bad Request (validación) |
| 401 | Unauthorized (sin token) |
| 403 | Forbidden (permisos) |
| 404 | Not Found |
| 409 | Conflict (duplicado, estado inválido) |
| 422 | Unprocessable Entity (regla de negocio) |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |

---

# HEADERS

## Request

| Header | Obligatorio | Descripción |
|--------|-------------|-------------|
| `Authorization` | Sí (excepto públicos) | `Bearer <accessToken>` |
| `Content-Type` | Sí en POST/PATCH | `application/json` |
| `X-Tenant-Id` | Opcional | Refuerza tenant (validado contra token) |
| `Idempotency-Key` | Recomendado en mutaciones | UUID para deduplicar |
| `X-Request-Id` | Opcional | Para tracing |
| `Accept-Language` | Opcional | `es-CO` default |

## Response

| Header | Descripción |
|--------|-------------|
| `X-Request-Id` | ID de la petición (generado si no se envía) |
| `X-RateLimit-Limit` | Límite total |
| `X-RateLimit-Remaining` | Restantes |
| `X-RateLimit-Reset` | Segundos hasta reset |
| `Content-Language` | Idioma de la respuesta |

---

# FORMATO DE RESPUESTA

## Respuesta exitosa (objeto)

```json
{
  "data": {
    "id": "uuid",
    "nombre": "Zapato Nike",
    "precio": 150000,
    ...
  },
  "meta": {
    "requestId": "req-abc-123",
    "timestamp": "2026-06-05T12:34:56.789Z"
  }
}
```

## Respuesta exitosa (colección)

```json
{
  "data": [
    { "id": "uuid-1", "nombre": "..." },
    { "id": "uuid-2", "nombre": "..." }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 145,
      "totalPages": 8
    },
    "requestId": "req-abc-123"
  }
}
```

## Respuesta de error

```json
{
  "statusCode": 422,
  "error": "INSUFFICIENT_STOCK",
  "message": "No hay stock suficiente para Zapato Nike Talla 38",
  "details": {
    "productId": "uuid",
    "requested": 5,
    "available": 2
  },
  "path": "/api/v1/sales",
  "timestamp": "2026-06-05T12:34:56.789Z",
  "requestId": "req-abc-123"
}
```

---

# CÓDIGOS DE ERROR

| Código HTTP | Código de error | Descripción |
|-------------|----------------|-------------|
| 400 | VALIDATION_ERROR | Validación de campos fallida |
| 400 | INVALID_JSON | Body mal formado |
| 401 | UNAUTHORIZED | Sin token |
| 401 | TOKEN_EXPIRED | Access token expirado |
| 401 | INVALID_TOKEN | Token inválido |
| 403 | FORBIDDEN | Sin permisos para el recurso |
| 403 | TENANT_MISMATCH | Token de otro tenant |
| 403 | PLAN_LIMIT_EXCEEDED | Límite del plan alcanzado |
| 404 | NOT_FOUND | Recurso no existe |
| 409 | DUPLICATE | Recurso duplicado (ej. SKU) |
| 409 | INVALID_STATE | Transición de estado inválida |
| 422 | INSUFFICIENT_STOCK | Sin stock |
| 422 | BUSINESS_RULE_VIOLATION | Regla de negocio violada |
| 422 | COVERAGE_OUT_OF_RANGE | Domicilio fuera de cobertura |
| 429 | RATE_LIMIT_EXCEEDED | Demasiadas peticiones |
| 500 | INTERNAL_ERROR | Error interno |
| 503 | SERVICE_UNAVAILABLE | Servicio en mantenimiento |

---

# PAGINACIÓN

Estrategia: **Offset-based** (page + pageSize) por defecto.

Query params:

```
?page=1&pageSize=20
```

Límites:

- `pageSize` mínimo: 1, máximo: 100, default: 20.
- `page` mínimo: 1, default: 1.

Para listados grandes se debe usar cursor-based (futuro):

```
?cursor=eyJpZCI6IjEyMyJ9&limit=20
```

---

# FILTROS Y ORDENAMIENTO

## Filtros

Sintaxis: `?field=value` o `?field[in]=a,b,c`.

```
?status=ACTIVE
?categoryId=uuid
?price[gte]=10000&price[lte]=50000
?createdAt[gte]=2026-01-01
```

Operadores: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `contains`, `startsWith`.

## Ordenamiento

```
?sort=field              # ASC
?sort=-field             # DESC
?sort=field1,-field2     # múltiple
```

## Búsqueda

```
?q=texto
```

Aplica a campos relevantes según el recurso (nombre, SKU, descripción, etc).

---

# IDEMPOTENCIA

Toda mutación crítica acepta `Idempotency-Key` (UUID v4).

Si se reenvía la misma petición con la misma key en 24h, se devuelve la misma respuesta cacheada.

Aplicar a:

- `POST /sales`
- `POST /orders`
- `POST /cash-movements`
- `POST /inventory-movements`
- `POST /payments`

Cache en Redis:

```
idempotency:{key} → { response, statusCode, expiresAt }
```

TTL: 24 horas.

---

# RATE LIMITING

Por IP y por tenant/usuario.

| Endpoint | Límite |
|----------|--------|
| `/auth/login` | 5 / 15 min por IP |
| `/auth/forgot-password` | 3 / 1h por IP |
| `/auth/refresh` | 60 / 1h por usuario |
| API general | 100 req / 1 min por usuario |
| API búsqueda marketplace | 30 / 1 min por IP |
| WebSocket connections | 5 por usuario |

Implementación: `@nestjs/throttler` con almacenamiento en Redis.

Respuesta cuando se excede: 429 con `Retry-After`.

---

# AUTENTICACIÓN

Header:

```
Authorization: Bearer <accessToken>
```

El access token se obtiene de `/auth/login` o `/auth/refresh`.

Refresh se envía en `POST /auth/refresh` en el body.

Detalle: [[AUTH.md]].

---

# CATÁLOGO DE ENDPOINTS (RESUMEN)

## Auth

```
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/change-password
POST   /auth/forgot-password
POST   /auth/reset-password
POST   /auth/accept-invitation
GET    /auth/me
```

## Tenants

```
GET    /tenants/me
PATCH  /tenants/me
GET    /tenants/me/settings
PATCH  /tenants/me/settings
```

## Users (admin de tenant)

```
GET    /users
POST   /users/invite
GET    /users/:id
PATCH  /users/:id
DELETE /users/:id (soft)
POST   /users/:id/resend-invitation
POST   /users/:id/deactivate
POST   /users/:id/activate
```

## Plans (público)

```
GET    /plans
GET    /plans/:id
```

## Subscriptions

```
GET    /tenants/me/subscription
POST   /tenants/me/subscription/change-plan
POST   /tenants/me/subscription/cancel
GET    /tenants/me/subscription/payments
```

## Categories

```
GET    /categories
POST   /categories
GET    /categories/:id
PATCH  /categories/:id
DELETE /categories/:id
```

## Products

```
GET    /products
POST   /products
GET    /products/:id
PATCH  /products/:id
DELETE /products/:id
POST   /products/import
GET    /products/export
GET    /products/:id/movements
POST   /products/:id/adjust-stock
```

## Variants

```
GET    /products/:id/variants
POST   /products/:id/variants
PATCH  /variants/:id
DELETE /variants/:id
```

## Suppliers

```
GET    /suppliers
POST   /suppliers
GET    /suppliers/:id
PATCH  /suppliers/:id
DELETE /suppliers/:id
```

## Purchases

```
GET    /purchases
POST   /purchases
GET    /purchases/:id
POST   /purchases/:id/cancel
```

## Customers

```
GET    /customers
POST   /customers
GET    /customers/:id
PATCH  /customers/:id
DELETE /customers/:id
GET    /customers/:id/history
POST   /customers/:id/tags
GET    /customers/:id/loyalty
```

## Sales (POS)

```
GET    /sales
POST   /sales
GET    /sales/:id
POST   /sales/:id/void
POST   /sales/:id/refund
```

## Cash registers

```
GET    /cash-registers
POST   /cash-registers/open
POST   /cash-registers/:id/close
GET    /cash-registers/:id/movements
POST   /cash-registers/:id/movements
```

## Expenses

```
GET    /expenses
POST   /expenses
GET    /expenses/:id
PATCH  /expenses/:id
DELETE /expenses/:id
```

## Orders

```
GET    /orders
POST   /orders
GET    /orders/:id
POST   /orders/:id/confirm
POST   /orders/:id/reject
POST   /orders/:id/cancel
POST   /orders/:id/preparing
POST   /orders/:id/ready
POST   /orders/:id/dispatch
POST   /orders/:id/deliver
POST   /orders/:id/assign-delivery
```

## Delivery config

```
GET    /delivery-config
PATCH  /delivery-config
GET    /delivery-config/coverage
```

## Reports

```
GET    /reports/dashboard
GET    /reports/sales
GET    /reports/products
GET    /reports/inventory
GET    /reports/customers
GET    /reports/delivery
GET    /reports/cashiers
GET    /reports/expenses
GET    /reports/profit
```

## Public (marketplace / catálogo)

```
GET    /public/businesses
GET    /public/businesses/:slug
GET    /public/businesses/:slug/products
GET    /public/businesses/:slug/categories
GET    /public/search
GET    /public/nearby
```

## Audit

```
GET    /audit-logs
GET    /audit-logs/:id
GET    /audit-logs/entity/:entidad/:entidadId
GET    /audit-logs/export
```

## Webhooks (fase 2)

```
POST   /webhooks/wompi
POST   /webhooks/whatsapp
```

---

# CONVENCIONES DE BODY

- camelCase para todos los campos.
- snake_case solo en nombres de archivos (uploads).
- IDs como string UUID.
- Timestamps en ISO 8601.
- Montos en centavos (integer) para evitar problemas de punto flotante.
- Booleanos explícitos (true/false).

---

# CONVENCIONES DE ERROR EN DESARROLLO

En modo desarrollo, los errores 500 incluyen:

```json
{
  ...,
  "stack": "Error: ...\n    at ...",
  "hint": "Posible causa: ..."
}
```

En producción: solo mensaje genérico, stack en logs internos.

---

# INTEGRACIÓN CON FRONTEND

- El frontend consume la API solo desde `frontend/src/services/`.
- Un servicio por módulo.
- Tipos generados a partir del backend (OpenAPI).
- React Query para fetching y cache.
- Axios o fetch nativo con interceptors para token refresh.

Detalle: [[ARQUITECTURA.md]] y frontend conventions en [[ESTRUCTURA.md]].

---

# EVENTOS RELACIONADOS

Toda llamada crítica a la API puede emitir eventos:

- `venta.realizada` tras `POST /sales`
- `order.confirmed` tras `POST /orders/:id/confirm`
- `inventory.adjusted` tras `POST /products/:id/adjust-stock`

Detalle: [[EVENTOS.md]].

---

# AUDITORÍA

Todas las llamadas a la API registradas en `AUDIT_LOGS`:

- método, ruta, status, duración, userId, tenantId, ip.

Para mutaciones, también oldValue/newValue.

Detalle: [[AUDITORIA.md]].

---

# REGLAS CRÍTICAS

- Toda ruta requiere autenticación (excepto `/auth/login`, `/auth/forgot-password`, `/public/*`, `/health`).
- Toda respuesta usa el formato estándar (success/error).
- Todo error 4xx tiene código legible.
- Todo error 5xx queda en logs con stack completo.
- Ninguna mutación procesa sin validación.
- Ningún endpoint expone datos de otro tenant.
- Ningún endpoint toca la DB sin pasar por un Service.
- La paginación nunca devuelve toda la tabla.
- El rate limiting se aplica a TODOS los endpoints (no solo a auth).
