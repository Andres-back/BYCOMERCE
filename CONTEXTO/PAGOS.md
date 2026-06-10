# PAGOS.md

# OBJETIVO

Definir el sistema de pagos de Mocoa Market.

Alcance:

- Métodos de pago aceptados.
- Flujo de cobro en POS.
- Flujo de cobro en pedidos.
- Flujo de cobro de suscripción.
- Registro y auditoría.
- Comisiones de plataforma (futuro).
- Integración futura con pasarela.

Detalle de suscripción: [[SUSCRIPCIONES.md]].

Detalle de WhatsApp: [[WHATSAPP.md]].

---

# DECISIÓN MVP

**Sin integración con pasarela de pagos online en MVP.**

Los cobros se manejan:

- **Offline / manual**: efectivo, transferencia bancaria, tarjeta física (datáfono del comercio).
- **Contra entrega**: en pedidos a domicilio, el domiciliario cobra al cliente.
- **Sin pasarela online**: no se cobra en línea ni con tarjeta vía plataforma en MVP.

Razón:

- Costos de integración con pasarela colombiana en MVP no justificados para el modelo de negocio actual.
- Los comerciantes ya tienen datáfono o reciben transferencias.
- Reduce complejidad de implementación y mantenimiento.

Ruta de evolución (fase 2):

- Integrar pasarela colombiana (Wompi, MercadoPago o PayU).
- Habilitar pagos online para pedidos.
- Habilitar cobro automático de suscripciones.

---

# MÉTODOS DE PAGO

## MVP (sin pasarela)

| Método | POS | Pedidos | Suscripción |
|--------|-----|---------|-------------|
| Efectivo | ✅ | ✅ (contra entrega) | ❌ |
| Transferencia bancaria | ✅ (registro manual) | ✅ (registro manual) | ✅ (registro manual) |
| Tarjeta (datáfono del comercio) | ✅ (registro manual) | ❌ | ❌ |
| Pago mixto | ✅ | ❌ | ❌ |
| Pago contra entrega | ❌ | ✅ | ❌ |

## Fase 2 (con pasarela)

| Método | POS | Pedidos | Suscripción |
|--------|-----|---------|-------------|
| Efectivo | ✅ | ✅ | ❌ |
| Transferencia | ✅ | ✅ | ❌ |
| Tarjeta online (pasarela) | ❌ | ✅ | ✅ |
| PSE | ❌ | ✅ | ✅ |
| Nequi / Daviplata | ❌ | ✅ | ❌ |

---

# MODELO DE DATOS

Fuente: [[Modelo Datos.md]].

## PAYMENTS (nueva)

Registra cualquier pago (POS, pedido, suscripción).

Campos:

- id
- tenant_id
- tipo (SALE, ORDER, SUBSCRIPTION)
- referencia_id (saleId, orderId, subscriptionId)
- metodo (EFECTIVO, TRANSFERENCIA, TARJETA, MIXTO, PASARELA_*)  // futuro
- monto (centavos, integer)
- comision_plataforma (centavos, integer, default 0)  // futuro
- estado (PENDIENTE, COMPLETADO, FALLIDO, REVERSADO)
- comprobante_url (MinIO)  // opcional
- observaciones
- usuario_id (quien registra)
- fecha_pago
- created_at
- updated_at

## SALE_PAYMENTS (nueva, MVP)

Para ventas con pago mixto, múltiples registros por venta.

Campos:

- id
- sale_id (FK)
- tenant_id
- metodo
- monto
- referencia_externa (número de transferencia, etc)
- fecha

## SALE_CHANGE (nueva, MVP)

Para vueltas en pagos efectivo.

Campos:

- id
- sale_id (FK)
- tenant_id
- monto_recibido
- cambio_entregado
- fecha

---

# FLUJOS MVP

## Venta POS en efectivo

```
Cajero totaliza venta
  ↓
Ingresa monto recibido
  ↓
Backend calcula cambio
  ↓
Crea SALE + SALE_ITEMS
  ↓
Crea SALE_PAYMENT (metodo=EFECTIVO, monto=total)
  ↓
Crea SALE_CHANGE (si aplica)
  ↓
Genera inventario salida
  ↓
Genera movimiento de caja
  ↓
Auditoría
  ↓
Imprime/envía recibo
```

## Venta POS pago mixto

```
Cajero totaliza venta
  ↓
Ingresa: $20.000 efectivo + $30.000 transferencia
  ↓
Backend valida suma = total
  ↓
Crea SALE + SALE_ITEMS
  ↓
Crea 2 SALE_PAYMENT (uno por método)
  ↓
Genera inventario salida
  ↓
Genera 2 movimientos de caja (uno por método)
  ↓
Auditoría
```

## Venta POS con datáfono

```
Cajero cobra con datáfono externo
  ↓
Selecciona método TARJETA
  ↓
Ingresa número de voucher o referencia
  ↓
Crea SALE + SALE_PAYMENT (metodo=TARJETA, ref=voucher)
  ↓
Marca como COMPLETADO
  ↓
Adjuntar comprobante (foto) opcional
```

## Pedido con pago contra entrega

```
Cliente hace pedido con método CONTRA_ENTREGA
  ↓
Crea ORDER (estado=PENDIENTE)
  ↓
Comercio confirma
  ↓
Al entregar, domiciliario registra pago:
  - efectivo → registra monto recibido
  - transferencia → cliente paga y envía comprobante
  - tarjeta → datáfono del domiciliario (futuro)
  ↓
Crea SALE_PAYMENT al entregar
  ↓
Marca ORDER como ENTREGADO
  ↓
Genera inventario salida
```

## Cobro de suscripción

```
Suscripción próxima a vencer (T-7 días)
  ↓
Email a ADMIN_NEGOCIO con instrucciones de pago
  ↓
Cliente paga por transferencia
  ↓
ADMIN_NEGOCIO o SUPER_ADMIN registra el pago
  ↓
Crea PAYMENT (tipo=SUBSCRIPTION)
  ↓
Extiende SUBSCRIPTION
  ↓
Auditoría
  ↓
Email de confirmación
```

Detalle: [[SUSCRIPCIONES.md]].

---

# CÁLCULO DE CAMBIO

```typescript
function calcularCambio(total: number, recibido: number) {
  if (recibido < total) {
    throw new BusinessException('MONTO_INSUFICIENTE');
  }
  return recibido - total;
}
```

Para pago mixto, el efectivo puede ser parcial:

```
Total: $50.000
Cliente paga: $20.000 efectivo + $30.000 transferencia
Cambio: $0 (suma exacta)
```

```
Total: $50.000
Cliente paga: $30.000 efectivo
Cliente adeuda: $20.000 (registrar como pendiente)
Cambio: $0
```

Reglas:

- Suma de pagos >= total.
- Si suma > total y todo es efectivo, dar cambio.
- Si suma > total y hay métodos no efectivo, no dar cambio (reintegrar al pago o rechazar).

---

# RECIBOS Y COMPROBANTES

## Recibo digital

Generado automáticamente al completar venta.

Contenido:

- Logo del tenant.
- Datos del tenant (NIT, RUT si tiene).
- Fecha y hora.
- Items con precio y subtotal.
- Descuentos.
- Impuestos.
- Total.
- Método de pago.
- Cambio (si efectivo).
- QR o link de contacto WhatsApp.

Formatos:

- HTML (para compartir por WhatsApp).
- PDF (descargable).
- Ticket térmico (futuro, integración con impresoras).

## Comprobante de pago

Imagen o PDF subido por el usuario al registrar transferencia.

Almacenado en MinIO:

```
comprobantes/{tenantId}/{yyyy}/{mm}/{dd}/{paymentId}.{ext}
```

---

# COMISIONES DE PLATAFORMA

Detalle de modelo de negocio: [[NEGOCIO.MD]].

**MVP: $0 de comisión.**

La plataforma cobra solo la suscripción mensual del tenant.

**Fase 2 (futuro):**

Si se monetizan transacciones (pedidos con pago online):

- Modelo A: comercio recibe 100%, plataforma cobra al cliente un fee.
- Modelo B: plataforma cobra % al comercio.
- Modelo C: híbrido.

El sistema debe permitir configurar el modelo por tenant.

Estructura preparada (sin uso aún):

- `PAYMENTS.comision_plataforma` (campo en cero en MVP).
- `PLANS.comision_transaccion_pct` (campo, default 0).
- `DELIVERY_CONFIG.comision_plataforma` (campo, default 0).

---

# REPORTES DE PAGOS

Fuente: [[REPORTES.md]].

Reportes específicos:

- Pagos por método (efectivo, transferencia, tarjeta).
- Pagos por período.
- Pagos pendientes (transferencias no confirmadas).
- Pagos contra entrega pendientes de registrar.
- Cobros de suscripción por período.

---

# EVENTOS RELACIONADOS

- `pago.registrado`
- `pago.completado`
- `pago.fallido`
- `pago.reversado`
- `pago.contra.entrega.registrado`
- `comprobante.subido`
- `recibo.generado`
- `cambio.calculado`

Detalle: [[EVENTOS.md]].

---

# AUDITORÍA

Todo pago queda en `AUDIT_LOGS`:

- `PAYMENT_CREATED`
- `PAYMENT_COMPLETED`
- `PAYMENT_FAILED`
- `PAYMENT_REVERSED`
- `PAYMENT_VOIDED` (admin anula)
- `PAYMENT_EXPORTED`

Detalle: [[AUDITORIA.md]].

---

# ROLES Y PERMISOS

| Acción | ADMIN_NEGOCIO | SUPERVISOR | CAJERO |
|--------|---------------|------------|--------|
| Registrar pago en venta | ✅ | ✅ | ✅ |
| Anular pago | ✅ | ✅ | ❌ |
| Registrar transferencia manual | ✅ | ✅ | ✅ |
| Adjuntar comprobante | ✅ | ✅ | ✅ |
| Reembolsar | ✅ | ❌ | ❌ |
| Ver reportes de pagos | ✅ | ✅ | 🔶 (sus ventas) |

Detalle: [[RBAC.md]].

---

# MIGRACIÓN A FASE 2 (PASARELA)

Cuando se integre pasarela:

1. Crear entidad `PAYMENT_GATEWAY_TRANSACTIONS` que persiste cada intento en la pasarela.
2. Implementar interfaz `PaymentGatewayProvider` con métodos:
   - `createTransaction(amount, method, metadata)`
   - `getStatus(transactionId)`
   - `refund(transactionId, amount)`
3. Implementar providers concretos (WompiProvider, MercadoPagoProvider).
4. Webhook endpoint que la pasarela llama al cambiar estado.
5. Tabla de configuración por tenant para credenciales (futuro enterprise).

La arquitectura de Payments se mantiene, solo se agregan campos y canales.

---

# REGLAS CRÍTICAS

- Ningún pago se registra sin referencia al SALE / ORDER / SUBSCRIPTION.
- Pago mixto requiere suma exacta o mayor a total.
- Si suma > total y hay no-efectivo, no se permite cambio (rechazar o ajustar).
- Todo comprobante subido a MinIO con prefijo de tenant.
- Comisiones de plataforma siempre en centavos (integer) para evitar floats.
- Reversión de pago solo por ADMIN_NEGOCIO o SUPERVISOR.
- Pago contra entrega solo válido en pedidos EN_CAMINO o ENTREGADO.
- Toda operación de pago queda en `AUDIT_LOGS`.
- Sin pasarela online: nunca pedir datos de tarjeta al cliente por la plataforma.
