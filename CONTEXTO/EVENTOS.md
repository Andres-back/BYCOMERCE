# EVENTOS.md

# OBJETIVO

Definir el sistema de eventos de Mocoa Market.

Alcance:

- Bus de eventos interno.
- Convenciones de nombres.
- Catálogo maestro de eventos.
- Publishers y subscribers.
- Garantías de entrega.
- Uso en WebSockets, jobs y notificaciones.

Detalle de arquitectura: [[ARQUITECTURA.md]].

Detalle de WebSockets: [[WEBSOCKETS.md]].

Detalle de notificaciones: [[NOTIFICACIONES.md]].

---

# DECISIÓN ARQUITECTÓNICA

- **BullMQ** sobre Redis para jobs durables (notificaciones, reportes, thumbnails).
- **Redis Pub/Sub** para fanout en tiempo real (WebSockets, presencia).
- **EventEmitter interno de NestJS** para casos síncronos en el mismo proceso.

Los tres conviven. Cada evento declara explícitamente su canal.

---

# CONVENCIONES DE NOMBRES

Formato: `entidad.accion` en kebab-case o dot.case.

Pasado para hechos consumados, imperativo para comandos:

- Hechos: `venta.realizada`, `pedido.entregado`, `stock.ajustado`.
- Comandos (raros): `orden.recalcular` (solicitud).

Mayúsculas solo en constantes de código (TypeScript class names):

```typescript
VentaRealizadaEvent
PedidoEntregadoEvent
StockAjustadoEvent
```

## Estructura del payload

```typescript
{
  eventId: string (UUID)
  eventName: string
  occurredAt: ISO timestamp
  tenantId: string | null
  actor: {
    userId: string | null
    sessionId: string | null
    isSystem: boolean
  }
  data: object (específico del evento)
  metadata: {
    correlationId: string
    causationId: string | null
    schemaVersion: 1
  }
}
```

## Versionado

- Campo `schemaVersion` en metadata.
- Cambios incompatibles: nuevo evento (`venta.realizada.v2`).
- Cambios compatibles (campos opcionales): mismo evento, bump schemaVersion.

---

# CANALES

## 1. EventEmitter (síncrono, mismo proceso)

Para eventos que solo otro módulo en el mismo proceso necesita consumir.

```typescript
this.eventEmitter.emit('venta.realizada', payload);
```

No persiste, no retry. Si el consumer falla, se pierde.

Uso: lógica inmediata que no debe pasar por cola (ej. actualizar cache local).

## 2. Redis Pub/Sub (tiempo real, fire-and-forget)

Para fanout a procesos en tiempo real (múltiples instancias del backend o WebSockets).

```typescript
await this.redis.publish(`tenant:${tenantId}:events`, JSON.stringify(payload));
```

No persiste, no retry.

Uso: WebSockets, broadcasting a workers en tiempo real.

## 3. BullMQ (durable, con retry)

Para jobs que deben ejecutarse sí o sí, con reintentos.

```typescript
await this.queue.add('notificar-pedido', payload, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: true,
  removeOnFail: 1000,
});
```

Persiste en Redis, retry configurable.

Uso: notificaciones, generación de reportes, envío de emails, thumbnails.

---

# COLAS (QUEUES) BULLMQ

Cada módulo declara sus queues.

| Queue | Eventos que procesa | Retry |
|-------|--------------------|----|
| `notifications` | notificar.* | 3 |
| `email` | email.* | 5 |
| `whatsapp` | whatsapp.* | 3 |
| `reports` | reporte.* | 2 |
| `thumbnails` | imagen.subida | 3 |
| `audit` | audit.* | 5 |
| `analytics` | analytics.* | 1 |
| `billing` | suscripcion.* | 5 |
| `webhooks` | webhook.* | 5 |

Detalle de workers: [[ARQUITECTURA.md]].

---

# CATÁLOGO MAESTRO DE EVENTOS

## Autenticación y usuarios

| Evento | Datos | Canal |
|--------|-------|-------|
| `auth.login.exitoso` | userId, ip | audit |
| `auth.login.fallido` | email, ip, razón | audit + alerta |
| `auth.password.cambiado` | userId | audit |
| `auth.password.reset.solicitado` | userId, ip | audit |
| `auth.password.reset.completado` | userId | audit |
| `auth.cuenta.bloqueada` | userId, intentos | audit + alerta |
| `auth.sesion.revocada` | userId, refreshId, razón | audit |
| `auth.impersonation.iniciada` | superAdminId, targetTenantId, razón | audit |
| `auth.impersonation.finalizada` | superAdminId, targetTenantId | audit |
| `usuario.invitado` | userId, email, rol | audit + email |
| `usuario.activado` | userId | audit |
| `usuario.desactivado` | userId, motivo | audit |

## Inventario

| Evento | Datos | Canal |
|--------|-------|-------|
| `producto.creado` | productId, snapshot | audit + cache invalidation |
| `producto.editado` | productId, oldValue, newValue | audit + cache invalidation |
| `producto.eliminado` | productId, snapshot | audit + cache invalidation |
| `stock.ajustado` | productId, cantidad, tipo, stockAnterior, stockNuevo | audit + analytics + alerta si stock bajo |
| `stock.bajo` | productId, stock, stockMinimo | alerta |
| `compra.registrada` | purchaseId, monto, supplierId | audit + analytics |
| `imagen.subida` | productId, url, tamaño | thumbnails |

## POS y ventas

| Evento | Datos | Canal |
|--------|-------|-------|
| `venta.realizada` | saleId, total, items count, customerId, cajeroId | audit + cache + analytics + crm + reportes |
| `venta.anulada` | saleId, motivo, usuarioAnulaId | audit + inventario reverso |
| `devolucion.realizada` | saleId, items, monto | audit + inventario + caja |
| `caja.abierta` | cashRegisterId, usuarioId, saldoInicial | audit + reportes |
| `caja.cerrada` | cashRegisterId, saldoEsperado, saldoReal, diferencia | audit + reportes |
| `gasto.registrado` | expenseId, monto, categoria | audit + reportes |
| `gasto.anulado` | expenseId, motivo | audit |

## Pedidos y domicilios

| Evento | Datos | Canal |
|--------|-------|-------|
| `pedido.creado` | orderId, total, customerId, origen | audit + ws + notificación comercio |
| `pedido.confirmado` | orderId, usuarioId | audit + ws + notificación cliente |
| `pedido.rechazado` | orderId, motivo | audit + notificación cliente |
| `pedido.preparando` | orderId | audit + ws |
| `pedido.listo` | orderId | audit + ws + notificación cliente |
| `pedido.en.camino` | orderId, domiciliarioId | audit + ws + notificación cliente |
| `pedido.entregado` | orderId, fecha, domiciliarioId | audit + inventario (consumir reserva) + caja |
| `pedido.cancelado` | orderId, motivo, quienCancela | audit + inventario (liberar reserva) + notificación |
| `domiciliario.asignado` | orderId, domiciliarioId | audit + ws + notificación domiciliario |
| `domiciliario.estado.cambiado` | domiciliarioId, estadoAnterior, estadoNuevo | audit + ws |

## Catálogo y marketplace

| Evento | Datos | Canal |
|--------|-------|-------|
| `producto.visualizado` | productId, customerId? | analytics |
| `producto.carrito.agregado` | productId, customerId? | analytics |
| `pedido.iniciado` | productIds, total | analytics |
| `pedido.enviado` | orderId | analytics + ws comercio |
| `comercio.visitado` | tenantId, ip | analytics |
| `busqueda.realizada` | termino, filtros, resultadosCount | analytics |
| `ubicacion.compartida` | customerId, lat, lng | ws |
| `ruta.solicitada` | tenantId, destino | analytics |

## CRM

| Evento | Datos | Canal |
|--------|-------|-------|
| `cliente.creado` | customerId, telefono | audit + crm |
| `cliente.editado` | customerId, cambios | audit |
| `cliente.eliminado` | customerId | audit |
| `cliente.clasificado` | customerId, segmentoAnterior, segmentoNuevo | crm + ws |
| `compra.realizada` | customerId, monto, saleId | crm (actualizar stats) |
| `pedido.realizado` | customerId, orderId | crm (actualizar stats) |
| `puntos.acumulados` | customerId, puntos, motivo | crm + ws |
| `puntos.canjeados` | customerId, puntos, beneficio | crm + audit |

## Suscripciones y billing

| Evento | Datos | Canal |
|--------|-------|-------|
| `suscripcion.creada` | subscriptionId, tenantId, planId | audit + email |
| `suscripcion.renovada` | subscriptionId, fecha, monto | audit + email |
| `suscripcion.cancelada` | subscriptionId, motivo, fechaFin | audit + email |
| `suscripcion.suspendida` | subscriptionId, motivo | audit + alerta |
| `suscripcion.reactivada` | subscriptionId | audit + email |
| `plan.cambiado` | tenantId, planAnterior, planNuevo | audit + email |
| `pago.recibido` | subscriptionId, monto, metodo | audit + reportes |
| `pago.fallido` | subscriptionId, monto, razon | audit + alerta |
| `limite.excedido` | tenantId, recurso, limite | alerta + ws |

## Sistema

| Evento | Datos | Canal |
|--------|-------|-------|
| `tenant.creado` | tenantId, slug, planId | audit + email |
| `tenant.activado` | tenantId | audit |
| `tenant.suspendido` | tenantId, motivo | audit + alerta |
| `tenant.reactivado` | tenantId | audit |
| `tenant.cancelado` | tenantId, fechaFin | audit |
| `reporte.generado` | reportId, tipo, formato | audit + email |
| `exportacion.realizada` | tipo, filtros, formato | audit |
| `backup.ejecutado` | tamaño, duracion | audit |
| `job.fallido` | queue, jobId, error | alerta |

---

# PATRONES DE USO

## Emisión desde un Service

```typescript
async createSale(dto: CreateSaleDto) {
  const sale = await prisma.$transaction(async (tx) => {
    // ... crear venta, items, movimientos, auditoría
    return sale;
  });

  // Emisión post-transacción
  this.eventEmitter.emit('venta.realizada', {
    eventId: randomUUID(),
    eventName: 'venta.realizada',
    occurredAt: new Date(),
    tenantId: sale.tenantId,
    actor: { userId: dto.usuarioId, sessionId: null, isSystem: false },
    data: { saleId: sale.id, total: sale.total, items: sale.items.length },
    metadata: { correlationId: req.requestId, causationId: null, schemaVersion: 1 },
  });

  // Job durable
  await this.notificationQueue.add('notificar-venta', { saleId: sale.id });

  return sale;
}
```

## Listener (decorator de NestJS)

```typescript
@OnEvent('venta.realizada')
async handleVentaRealizada(payload: VentaRealizadaEvent) {
  await this.crmService.actualizarEstadisticas(payload.data.customerId, payload.data.total);
}
```

## Worker BullMQ

```typescript
@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  async process(job: Job<NotificationPayload>) {
    await this.notificationService.send(job.data);
  }
}
```

---

# IDEMPOTENCIA EN CONSUMERS

Cada consumer debe ser idempotente.

- Verificar si el evento ya fue procesado (por `eventId`).
- Usar transacciones.
- Lock distribuido si es crítico (Redis SETNX con TTL).

Tabla auxiliar para tracking:

```sql
processed_events (
  event_id UUID PRIMARY KEY,
  consumer_name VARCHAR,
  processed_at TIMESTAMP
)
```

---

# OBSERVABILIDAD

- Cada evento logueado en DEBUG con payload completo.
- Métricas: count por evento, latencia, errores.
- BullMQ UI para inspeccionar jobs (en admin).
- Eventos fallidos van a `failed-jobs` con stack trace.

---

# REGLAS CRÍTICAS

- Todo evento declara su `schemaVersion`.
- Todo consumer es idempotente.
- Ningún evento incluye datos sensibles en claro (cifrar si es necesario).
- Ningún evento se emite dentro de una transacción Prisma (siempre después).
- Ningún evento crítica se pierde: usar BullMQ para durable.
- Ningún evento se procesa sin validar `tenantId`.
- El payload nunca excede 1MB (si es más grande, usar storage + URL).
- Ningún listener de evento puede emitir el mismo evento (evitar loops).
