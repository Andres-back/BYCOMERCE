# SUSCRIPCIONES.md

# OBJETIVO

Definir el ciclo de vida de las suscripciones de los tenants de Mocoa Market.

Alcance:

- Planes disponibles.
- Ciclo de facturación.
- Activación, renovación, cancelación, suspensión.
- Cobro (manual en MVP).
- Límites por plan.
- Cambios de plan (upgrade/downgrade).
- Reportes de suscripción.

Detalle de pagos: [[PAGOS.md]].

Detalle de planes de negocio: [[NEGOCIO.MD]].

Detalle de multi-tenant: [[MULTI_TENANT.md]].

---

# DECISIÓN MVP

**Cobro manual / transferencia.**

- No hay pasarela de pago integrada.
- El cliente (tenant) paga por transferencia bancaria a Mocoa Market.
- ADMIN_NEGOCIO o SUPER_ADMIN registra el pago manualmente.
- Email de aviso cuando se aproxima el vencimiento.
- Email de gracias al confirmar pago.
- Suspender si vence el período de gracia.

Razón: simple, sin costo de pasarela, suficiente para lanzamiento.

Fase 2: integrar pasarela para cobro automático.

---

# PLANES

Fuente: [[NEGOCIO.MD]] y [[Modelo Datos.md]].

## Catálogo de planes

| Plan | Precio (COP/mes) | Usuarios | Productos | Storage |
|------|------------------|----------|-----------|---------|
| EMPRENDEDOR | $14.900 | 2 | 100 | 1 GB |
| NEGOCIO | $24.900 | 5 | 500 | 5 GB |
| NEGOCIO_PLUS | $39.900 | 10 | 2.000 | 20 GB |
| PREMIUM | $59.900 | 25 | 10.000 | 50 GB |

## Promoción de lanzamiento

Primeros 50 tenants: $9.900/mes durante el primer año.

Campo `PLANS.es_promocional` o flag en `TENANTS.plan_promocional_hasta`.

## Servicios adicionales

- Publicidad destacada: $10.000 - $30.000/mes.
- Diseño premium: $100.000 - $500.000 (pago único).
- Dominio personalizado: precio variable.
- Integraciones especiales: bajo cotización.

---

# MODELO DE DATOS

Fuente: [[Modelo Datos.md]].

## PLANS (ya existe)

```typescript
{
  id, nombre, descripcion, precio,
  limiteUsuarios, limiteProductos, almacenamientoGb,
  caracteristicas: JSON,  // features habilitadas
  estado,
  createdAt, updatedAt
}
```

## SUBSCRIPTIONS (ya existe, refinar)

```typescript
{
  id, tenantId, planId,
  fechaInicio, fechaFin, fechaProximoCobro,
  estado,  // ACTIVA, VENCIDA, SUSPENDIDA, CANCELADA, EN_PRUEBA
  enPromocion,  // bool
  fechaFinPromocion,  // nullable
  montoMensual,  // snapshot
  ultimoPago,  // fecha del último PAYMENT tipo SUBSCRIPTION
  createdAt, updatedAt
}
```

## SUBSCRIPTION_PAYMENTS (nueva)

Registro de cada pago de la suscripción.

```typescript
{
  id, subscriptionId, tenantId,
  monto,  // centavos
  metodo,  // TRANSFERENCIA, PASARELA (futuro)
  comprobanteUrl,  // MinIO
  numeroReferencia,  // número de transferencia
  fechaPago,
  fechaInicioCubierta,  // desde cuándo cubre este pago
  fechaFinCubierta,  // hasta cuándo cubre este pago
  registradoPor,  // userId que registró
  createdAt
}
```

## PLAN_HISTORY (nueva)

Historial de cambios de plan.

```typescript
{
  id, tenantId,
  planAnteriorId, planNuevoId,
  fechaCambio, motivo,  // UPGRADE, DOWNGRADE, RENOVACION_PROMO
  usuarioId,
  createdAt
}
```

---

# CICLO DE VIDA

## Estados

```
EN_PRUEBA → ACTIVA → VENCIDA → SUSPENDIDA → CANCELADA
                 ↑______________| (reactivación)
                 ↓
              CANCELADA (voluntario)
```

### EN_PRUEBA

- Período: 14 días desde creación del tenant.
- Acceso completo al plan EMPRENDEDOR.
- Sin cobro.
- Email de aviso 3 días antes de vencer.

### ACTIVA

- Suscripción vigente.
- Acceso completo a funcionalidades del plan.
- Límites aplicables.
- Se renueva al recibir pago.

### VENCIDA

- Fecha fin alcanzada sin pago.
- Acceso solo lectura.
- Período de gracia: 7 días.
- Email diario de aviso.

### SUSPENDIDA

- Después de 7 días de gracia sin pago.
- Login bloqueado.
- Solo SUPER_ADMIN puede acceder.
- Datos preservados.
- Email final de aviso.

### CANCELADA

- Tenant solicitó baja o SUPER_ADMIN decidió cancelar.
- Sin acceso.
- Datos preservados por 90 días para reactivación.
- Después: archivados (no eliminados por compliance).

## Transiciones

| De | A | Trigger | Quién |
|----|---|---------|-------|
| (nuevo) | EN_PRUEBA | Onboarding tenant | Sistema |
| EN_PRUEBA | ACTIVA | Pago recibido | Sistema o Admin |
| EN_PRUEBA | VENCIDA | 14 días sin pago | Cron |
| ACTIVA | ACTIVA | Pago recibido | Sistema o Admin |
| ACTIVA | VENCIDA | Fecha fin sin pago | Cron |
| VENCIDA | ACTIVA | Pago dentro de gracia | Sistema o Admin |
| VENCIDA | SUSPENDIDA | 7 días de gracia sin pago | Cron |
| SUSPENDIDA | ACTIVA | Pago regularizador | Admin |
| SUSPENDIDA | CANCELADA | 30 días sin pago | Cron |
| ACTIVA | CANCELADA | Solicitud del tenant | Admin o Sistema |

---

# FLUJOS

## Onboarding de nuevo tenant

```
Formulario público /signup o registro manual por SUPER_ADMIN
  ↓
1. Crear TENANT (estado=PENDIENTE)
2. Crear SUBSCRIPTION (estado=EN_PRUEBA, plan=EMPRENDEDOR, 14 días)
3. Crear USERS admin (ADMIN_NEGOCIO, estado=PENDIENTE)
4. Crear BUSINESS_SETTINGS defaults
5. Crear DELIVERY_CONFIG defaults
6. Crear categorías vacías
  ↓
Email de bienvenida con link de activación
  ↓
ADMIN_NEGOCIO completa registro
  ↓
TENANT.estado = ACTIVO
USERS.estado = ACTIVO
  ↓
Auditoría: TENANT_CREADO
```

## Cobro mensual

```
Cron diario verifica suscripciones con fechaProximoCobro en 7 días
  ↓
Email: "Tu suscripción vence el {fecha}"
  ↓
Tenant paga por transferencia
  ↓
ADMIN_NEGOCIO sube comprobante o SUPER_ADMIN registra pago manual
  ↓
Crea SUBSCRIPTION_PAYMENT
  ↓
Actualiza SUBSCRIPTION:
  - fechaFin = fechaFin + 30 días
  - fechaProximoCobro = fechaFin
  - ultimoPago = now
  - estado = ACTIVA
  ↓
Si estaba VENCIDA/SUSPENDIDA → transicionar a ACTIVA
  ↓
Auditoría: PAGO_RECIBIDO + SUSCRIPCION_RENOVADA
  ↓
Email de confirmación con factura
```

## Cambio de plan (upgrade)

```
ADMIN_NEGOCIO solicita cambio desde panel
  ↓
Backend valida: plan destino >= plan actual (o justificación)
  ↓
Calcula prorrateo:
  - Días restantes del plan actual: X
  - Precio nuevo plan: Y
  - Diferencia proporcional
  ↓
Crea PLAN_HISTORY
  ↓
Actualiza SUBSCRIPTION.planId
  ↓
Actualiza límites inmediatamente
  ↓
Genera cobro por diferencia (registro manual)
  ↓
Email de confirmación
```

## Cambio de plan (downgrade)

```
ADMIN_NEGOCIO solicita downgrade
  ↓
Backend valida: uso actual <= límites del plan destino
  - count(users) <= nuevo limiteUsuarios
  - count(products) <= nuevo limiteProductos
  - storage <= nuevo almacenamientoGb
  ↓
Si excede:
  → Marcar usuarios/productos excedentes como "inactivos por plan"
  → Notificar al admin para que reduzca
  → Bloquear cambio hasta resolver
  ↓
Si OK:
  - Aplica al final del período actual
  - Crea PLAN_HISTORY con fecha efectiva
  - Email con resumen
```

## Cancelación

```
ADMIN_NEGOCIO solicita cancelación (con confirmación)
  ↓
SUBSCRIPTION.estado = CANCELADA
  ↓
TENANT.estado = CANCELADO
  ↓
Acceso bloqueado
  ↓
Datos preservados 90 días
  ↓
Reactivación: SUPER_ADMIN con pago
```

## Suspensión automática

```
Cron diario busca suscripciones VENCIDAS + 7 días
  ↓
SUBSCRIPTION.estado = SUSPENDIDA
TENANT.estado = SUSPENDIDO
  ↓
USERS activos → estado = SUSPENDIDO
  ↓
Email final con aviso
  ↓
Reactivación: pago + SUPER_ADMIN
```

---

# VALIDACIÓN DE LÍMITES

Middleware antes de crear recursos.

```typescript
async validarLimiteUsuarios(tenantId: string) {
  const sub = await this.subscriptionService.getActive(tenantId);
  const plan = await this.planService.getById(sub.planId);
  const count = await this.userService.countActive(tenantId);
  if (count >= plan.limiteUsuarios) {
    throw new BusinessException('PLAN_LIMIT_EXCEEDED', { recurso: 'usuarios' });
  }
}
```

Igual para:

- `limiteProductos`
- `almacenamientoGb`
- (futuro) `limiteSucursales`, `limitePedidosMes`

Respuesta al frontend:

```json
{
  "error": "PLAN_LIMIT_EXCEEDED",
  "message": "Has alcanzado el límite de 5 usuarios de tu plan",
  "details": {
    "recurso": "usuarios",
    "limite": 5,
    "uso": 5,
    "planUpgrade": "NEGOCIO_PLUS"
  }
}
```

El frontend muestra upsell con CTA a upgrade.

---

# CRON JOBS

Fuente: [[EVENTOS.md]] y arquitectura.

| Job | Frecuencia | Acción |
|-----|-----------|--------|
| `subscription.checkExpiring` | Diario 00:00 | Email T-7 días |
| `subscription.markExpired` | Diario 00:30 | Marca VENCIDAS |
| `subscription.markSuspended` | Diario 00:30 | Suspende tras gracia |
| `subscription.markCancelled` | Diario 01:00 | Cancela tras 30 días suspendido |
| `plan_history.snapshot` | Diario | Snapshot para BI |

---

# EVENTOS RELACIONADOS

- `suscripcion.creada`
- `suscripcion.renovada`
- `suscripcion.vencida`
- `suscripcion.suspendida`
- `suscripcion.reactivada`
- `suscripcion.cancelada`
- `suscripcion.proxima.vencer`
- `plan.cambiado`
- `limite.excedido`
- `pago.recibido`
- `pago.fallido`

Detalle: [[EVENTOS.md]].

---

# REPORTES

Para SUPER_ADMIN (cross-tenant):

- MRR (Monthly Recurring Revenue).
- ARR (Annual Recurring Revenue).
- Churn rate.
- Nuevos tenants por período.
- Distribución por plan.
- Cobros pendientes.
- Cobros fallidos.
- Suscripciones próximas a vencer.

Para ADMIN_NEGOCIO:

- Historial de pagos de mi suscripción.
- Facturas descargables (PDF).
- Plan actual y límites.
- Opción de cambiar plan.

---

# AUDITORÍA

Todo evento de suscripción queda en `AUDIT_LOGS`:

- `SUBSCRIPTION_CREATED`
- `SUBSCRIPTION_RENOVED`
- `SUBSCRIPTION_EXPIRED`
- `SUBSCRIPTION_SUSPENDED`
- `SUBSCRIPTION_REACTIVATED`
- `SUBSCRIPTION_CANCELLED`
- `PLAN_CHANGED`
- `PAYMENT_RECORDED`
- `LIMIT_EXCEEDED`

Detalle: [[AUDITORIA.md]].

---

# ROLES Y PERMISOS

| Acción | ADMIN_NEGOCIO | Otros |
|--------|---------------|-------|
| Ver mi suscripción | ✅ | ❌ |
| Subir comprobante de pago | ✅ | ❌ |
| Solicitar cambio de plan | ✅ | ❌ |
| Solicitar cancelación | ✅ | ❌ |
| Ver historial de pagos | ✅ | ❌ |
| Ver todas las suscripciones (plataforma) | ❌ | SUPER_ADMIN |
| Suspender / Reactivar tenant | ❌ | SUPER_ADMIN |
| Registrar pago manual | ❌ | SUPER_ADMIN |

Detalle: [[RBAC.md]].

---

# REGLAS CRÍTICAS

- Ningún tenant puede operar sin suscripción ACTIVA o EN_PRUEBA.
- Cambio de plan se valida contra uso actual antes de aplicar.
- Downgrade no puede superar el uso actual (bloquea o marca excedentes).
- Super Admin siempre puede extender períodos manualmente (soporte).
- Pagos de suscripción prorrateados correctamente.
- Sin pasarela: ningún cargo automático; todo es registro manual.
- Toda transición de estado queda auditada.
- Datos del tenant cancelado se preservan 90 días (no se borran).
- Email de aviso se envía ANTES del vencimiento, no después.
