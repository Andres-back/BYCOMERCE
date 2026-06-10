# SUCURSALES.md

# OBJETIVO

Definir el soporte multi-sucursal de Mocoa Market.

Alcance:

- Modelo de datos.
- Aislamiento de operaciones por sucursal.
- Usuarios asignados.
- Inventario por sucursal.
- Reportes consolidados.
- Delivery con origen por sucursal.
- Migración desde tenant único.

Detalle de multi-tenant: [[MULTI_TENANT.md]].

Detalle de inventario: [[Inventario.md]].

Detalle de domicilios: [[DOMICILIOS.md]].

---

# DECISIÓN MVP

**Arquitectura preparada, soporte opcional.**

En MVP, cada `TENANT` representa un comercio con una sola ubicación física.

El modelo de datos permite múltiples sucursales por tenant desde el inicio, pero la UI y los flujos asumen 1 sucursal.

Activación de multi-sucursal:

- Flag `TENANT.multi_sucursal = true` en configuración.
- Habilita UI de gestión de sucursales.
- Activa filtros de sucursal en operaciones.

Razón:

- Pequeños comerciantes tienen 1 ubicación.
- Diseñar desde el inicio para escalar.
- Costo de implementación bajo si se hace desde el principio.

---

# MODELO DE DATOS

## TENANT_BRANCHES (nueva)

```typescript
{
  id, tenantId,
  nombre,  // "Sucursal Centro", "Sucursal Norte"
  codigo,  // código interno
  direccion, barrio, ciudad,
  latitud, longitud,
  telefono, whatsapp, email,
  horarioAtencion (JSON),  // { lunes: {abre, cierra}, ... }
  esPrincipal (bool),
  estado (ACTIVA, INACTIVA),
  createdAt, updatedAt
}
```

Reglas:

- Un tenant puede tener 0 o N sucursales.
- Si 0, las operaciones usan la dirección del tenant como única ubicación.
- Si 1+, la primera creada es `esPrincipal = true` por defecto.
- Siempre debe haber al menos una sucursal principal.

## PRODUCT_STOCK_BY_BRANCH (nueva)

Stock de cada producto por sucursal.

```typescript
{
  id, tenantId, branchId, productId,
  stock, stockReservado, stockMinimo,
  updatedAt
}
```

Si el tenant es multi-sucursal, esta tabla es la fuente de stock.

Si es single-sucursal, se mantiene `PRODUCTS.stock` (compatibilidad) pero se replica en la tabla.

## USER_BRANCHES (nueva, pivote)

Asignación de usuarios a sucursales.

```typescript
{
  id, userId, branchId,
  rol (CAJERO, SUPERVISOR, DOMICILIARIO),  // opcional, override
  esPrincipal (bool),
  createdAt
}
```

Un usuario puede estar asignado a múltiples sucursales.

## DELIVERY_ORIGIN_BRANCH (extender ORDERS)

```typescript
orders.branchId (nullable)  // sucursal de donde sale el pedido
```

Por defecto la principal.

## INVENTORY_MOVEMENTS.branchId (extender)

```typescript
inventory_movements.branchId (nullable)  // sucursal afectada
```

---

# TIPOS DE TENANT

## Single-tenant single-branch (MVP default)

- 1 TENANT.
- 0 o 1 TENANT_BRANCH.
- Inventario: `PRODUCTS.stock` (sin tabla de stock por sucursal).
- Pedidos: `branchId` null (implícitamente la principal).
- Usuarios: asignados al tenant, sin restricción de sucursal.

## Single-tenant multi-branch (Fase 2)

- 1 TENANT.
- N TENANT_BRANCH.
- Inventario: `PRODUCT_STOCK_BY_BRANCH`.
- Pedidos: `branchId` requerida (puede ser auto-asignada o manual).
- Usuarios: pueden estar asignados a N sucursales.

## Multi-tenant multi-branch (Enterprise, fase futura)

N tenants independientes, cada uno con N sucursales.

(No soportado en MVP. Hoy cada sucursal es un tenant separado.)

---

# FLUJOS

## Activación de multi-sucursal

```
ADMIN_NEGOCIO activa multi-sucursal
  ↓
Crear primera TENANT_BRANCH (la del tenant, esPrincipal=true)
  ↓
Backend migra stock:
  - Por cada PRODUCT, crear PRODUCT_STOCK_BY_BRANCH para la sucursal principal
  - Mantener PRODUCTS.stock sincronizado
  ↓
Crear UI de gestión de sucursales
  ↓
Auditoría: MULTI_BRANCH_ENABLED
```

## Crear nueva sucursal

```
ADMIN_NEGOCIO crea nueva sucursal
  ↓
Backend valida límite del plan (limiteSucursales)
  ↓
Crea TENANT_BRANCH (esPrincipal=false por defecto)
  ↓
Inicializa stock en 0 para todos los productos
  ↓
Auditoría: BRANCH_CREATED
```

## Asignar usuario a sucursal

```
ADMIN_NEGOCIO asigna usuario
  ↓
Crea USER_BRANCHES
  ↓
Si user es CAJERO o SUPERVISOR, ve solo datos de sus sucursales
  ↓
Si user es DOMICILIARIO, se le pueden asignar pedidos de sus sucursales
  ↓
Auditoría: USER_ASSIGNED_TO_BRANCH
```

## Pedido multi-sucursal

```
Cliente hace pedido
  ↓
Backend determina sucursal de origen:
  - Si cliente eligió → usar esa
  - Si no, calcular la más cercana con stock disponible
  ↓
Valida stock en PRODUCT_STOCK_BY_BRANCH
  ↓
Crea ORDER con branchId
  ↓
Reserva stock en esa sucursal
  ↓
Notifica a la sucursal asignada
```

## Transferencia de stock entre sucursales

```
ADMIN_NEGOCIO transfiere stock de A → B
  ↓
Crear INVENTORY_MOVEMENT (tipo=TRANSFERENCIA) en A (SALIDA)
  ↓
Crear INVENTORY_MOVEMENT (tipo=TRANSFERENCIA) en B (ENTRADA)
  ↓
Actualizar PRODUCT_STOCK_BY_BRANCH en ambas
  ↓
Auditoría
```

---

# INVENTARIO EN MULTI-SUCURSAL

## Regla principal

En multi-sucursal, `PRODUCT_STOCK_BY_BRANCH.stock` es la fuente.

`PRODUCTS.stock` puede mantenerse como consolidado (suma) para queries rápidas.

## Consultas

- Stock de un producto en una sucursal: `findUnique(productId, branchId)`.
- Stock total de un producto: `sum(stock) where productId`.
- Stock total de una sucursal: `sum(stock) where branchId`.

## Reportes

- Stock por sucursal.
- Stock consolidado.
- Transferencias entre sucursales.
- Productos con stock bajo por sucursal.

---

# PEDIDOS Y DOMICILIOS

## Asignación de sucursal

Manual: cliente elige al hacer pedido.

Automático (futuro): calcular la sucursal más cercana con stock.

Criterios:

- Distancia (PostGIS).
- Stock disponible.
- Disponibilidad de domiciliarios.

## Delivery

- Cada domiciliario asignado a una o varias sucursales.
- El pedido se asigna a un domiciliario de la sucursal de origen.
- Tracking del domicilio es independiente de la sucursal.

---

# USUARIOS Y ROLES

## Single-sucursal

- Todos los usuarios ven toda la data del tenant.
- Sin filtro de sucursal.

## Multi-sucursal

- ADMIN_NEGOCIO: ve todo, todas las sucursales.
- SUPERVISOR: configurable. Si asignado a sucursales, ve solo esas.
- CAJERO: solo su(s) sucursal(es).
- DOMICILIARIO: solo su(s) sucursal(es).

## TenantContext.branchIds

En multi-sucursal, el contexto incluye las sucursales del usuario:

```typescript
interface TenantContext {
  tenantId: string;
  branchIds: string[];  // [] = todas
  isSuperAdmin: boolean;
}
```

Filtros Prisma ajustan `where.branchId` según `branchIds`.

---

# REPORTES

## Consolidados (todo el tenant)

- Ventas totales.
- Productos vendidos.
- Ingresos.
- Inventario valorizado total.

## Por sucursal

- Ventas de la sucursal.
- Inventario de la sucursal.
- Caja de la sucursal.
- Domicilios originados.
- Empleados activos.

## Comparativos

- Sucursal A vs B.
- Evolución por sucursal.

Detalle: [[REPORTES.md]].

---

# EVENTOS RELACIONADOS

- `branch.creada`
- `branch.activada`
- `branch.desactivada`
- `branch.asignada.usuario`
- `stock.transferido`
- `pedido.asignado.sucursal`
- `multi_branch.enabled`
- `multi_branch.disabled`

Detalle: [[EVENTOS.md]].

---

# AUDITORÍA

- `BRANCH_CREATED`
- `BRANCH_UPDATED`
- `BRANCH_DEACTIVATED`
- `USER_ASSIGNED_TO_BRANCH`
- `STOCK_TRANSFERRED`
- `MULTI_BRANCH_ENABLED`
- `MULTI_BRANCH_DISABLED`

Detalle: [[AUDITORIA.md]].

---

# ROLES Y PERMISOS

| Acción | ADMIN_NEGOCIO | SUPERVISOR | CAJERO |
|--------|---------------|------------|--------|
| Ver sucursales | ✅ | ✅ (asignadas) | ✅ (asignadas) |
| Crear sucursal | ✅ | ❌ | ❌ |
| Editar sucursal | ✅ | ❌ | ❌ |
| Asignar usuarios | ✅ | ❌ | ❌ |
| Transferir stock | ✅ | ✅ | ❌ |
| Ver reporte consolidado | ✅ | ❌ | ❌ |
| Ver reporte de su sucursal | ✅ | ✅ | 🔶 |

Detalle: [[RBAC.md]].

---

# MIGRACIÓN SINGLE → MULTI

Si un tenant quiere activar multi-sucursal:

1. Crear primera `TENANT_BRANCH` desde datos del tenant.
2. Migrar stock: `PRODUCT_STOCK_BY_BRANCH[producto, branch_principal] = PRODUCTS.stock`.
3. Marcar `TENANT.multi_sucursal = true`.
4. Habilitar UI multi-sucursal.
5. Asignar usuarios a la sucursal principal.
6. Permitir agregar más sucursales.

Si se desactiva:

1. Consolidar stock: `PRODUCTS.stock = sum(PRODUCT_STOCK_BY_BRANCH.stock)`.
2. Marcar otras sucursales como inactivas.
3. `TENANT.multi_sucursal = false`.
4. Mantener datos (no se borran).

---

# LIMITES POR PLAN

Extender `PLANS`:

```typescript
limiteSucursales: int  // 1, 3, 10, ilimitado
```

Default por plan:

- EMPRENDEDOR: 1
- NEGOCIO: 1
- NEGOCIO_PLUS: 3
- PREMIUM: 10 (o ilimitado)

Validar al intentar crear nueva sucursal.

---

# REGLAS CRÍTICAS

- Toda operación multi-sucursal filtra por `branchId` o `branchIds`.
- La sucursal principal no se puede eliminar (solo desactivar y promover otra).
- Transferencia de stock SIEMPRE se registra como 2 movimientos (salida + entrada).
- Usuario sin sucursal asignada en multi-sucursal NO ve datos.
- Reportes consolidados respetan multi-tenant.
- El `branchId` se incluye en todo evento de dominio relevante.
- La migración single → multi es irreversible sin acción manual.
- Datos de sucursales inactivas se preservan (no se borran).
