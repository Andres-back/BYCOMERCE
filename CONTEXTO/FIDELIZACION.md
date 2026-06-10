# FIDELIZACION.md

# OBJETIVO

Definir el sistema de fidelización de Mocoa Market.

Alcance:

- Programa de puntos.
- Niveles / segmentos de cliente.
- Beneficios.
- Canje de puntos.
- Reglas de acumulación.
- Integración con CRM.

Detalle de CRM: [[CRM_CLIENTE.md]].

Detalle de promociones: [[PROMOCIONES.md]].

---

# DECISIÓN MVP

**Arquitectura preparada, funcionalidades opcionales.**

En MVP:

- Estructura de datos lista.
- Reglas configurables.
- Lógica de puntos implementada como opcional por tenant.

El tenant decide si activa el programa de fidelización.

Si está activo, los clientes acumulan puntos por compra y pueden canjearlos.

---

# MODELO DE DATOS

## LOYALTY_PROGRAMS (nueva)

Configuración del programa por tenant.

```typescript
{
  id, tenantId,
  activo (bool),
  nombre, descripcion,
  // Reglas de acumulación
  puntosPorPeso (numeric),  // ej: 1 punto por cada $1.000 gastados
  puntosBienvenida (int),  // puntos al primer pedido
  puntosPorCumpleanos (int),
  // Reglas de expiración
  expiracionMeses (int, nullable),  // puntos expiran a los N meses
  // Restricciones
  excluirProductos (text[]),  // productos que no acumulan puntos
  excluirCategorias (text[]),
  montoMinimoAcumular (numeric, nullable),  // mínimo de compra para acumular
  // Niveles
  nivelesActivos (bool),
  createdAt, updatedAt
}
```

## LOYALTY_TIERS (nueva)

Niveles del programa.

```typescript
{
  id, tenantId,
  nombre,  // BRONCE, PLATA, ORO, PLATINO
  descripcion,
  puntosRequeridos (int),  // puntos para alcanzar el nivel
  multiplicadorPuntos (numeric, default 1),  // 1x, 1.5x, 2x
  beneficios (JSON),  // [{ tipo: 'DESCUENTO', valor: 5 }, ...]
  color, icono,
  orden
}
```

## LOYALTY_POINTS (nueva, refinar)

Registro de puntos por cliente.

```typescript
{
  id, tenantId,
  customerId,
  tipo,  // ACUMULACION, CANJE, EXPIRACION, AJUSTE, BIENVENIDA, CUMPLEANOS
  puntos (int, signed),  // + o -
  referenciaTipo,  // SALE, ORDER, MANUAL
  referenciaId,
  descripcion,
  fechaExpiracion (nullable),
  createdAt
}
```

## LOYALTY_BALANCE (vista materializada o cálculo)

Saldo de puntos por cliente.

```typescript
{
  customerId,
  puntosDisponibles (int),
  puntosPorExpirar (int),  // próximos 30 días
  fechaProximaExpiracion,
  nivelActual,
  puntosParaSiguienteNivel,
  totalAcumuladoHistorico (int)
}
```

Calculado en tiempo real (suma de `LOYALTY_POINTS` con `tipo=ACUMULACION` menos `tipo=CANJE/EXPIRACION`).

Cacheado en Redis con TTL 5 min, invalidado en cada cambio.

## LOYALTY_REWARDS (nueva)

Beneficios canjeables.

```typescript
{
  id, tenantId,
  nombre, descripcion,
  tipo,  // DESCUENTO_PORCENTAJE, DESCUENTO_MONTO, PRODUCTO_GRATIS, ENVIO_GRATIS
  valor (numeric),
  puntosRequeridos (int),
  stock (nullable),  // para productos gratis
  productoId (nullable, para producto gratis),
  nivelRequerido (nullable,  // tier mínimo
  fechaInicio, fechaFin (nullable),
  limitePorCliente (int, nullable),
  estado,
  createdAt
}
```

## LOYALTY_REDEMPTIONS (nueva)

Registro de canjes.

```typescript
{
  id, tenantId,
  customerId,
  rewardId,
  puntosCanjeados,
  estado (PENDIENTE, APLICADO, EXPIRADO, CANCELADO),
  saleId (nullable),  // si se aplicó en una venta
  orderId (nullable),
  fechaCanje,
  fechaExpiracion
}
```

---

# NIVELES (TIERS)

## Niveles sugeridos

| Nivel | Puntos requeridos | Multiplicador | Beneficios |
|-------|-------------------|---------------|------------|
| BRONCE | 0 | 1x | Acumular puntos |
| PLATA | 500 | 1.25x | + 5% descuento cumpleaños |
| ORO | 2.000 | 1.5x | + Envío gratis, acceso anticipado a promos |
| PLATINO | 5.000 | 2x | + Regalos, soporte prioritario |

Configurables por tenant.

## Ascenso

Automático al alcanzar los puntos requeridos.

## Descenso

Nunca. Los puntos pueden expirar pero el nivel se mantiene.

Regla alternativa (configurable): reset de puntos al cierre de año y recalcular nivel.

---

# FLUJOS

## Acumulación de puntos

```
Cliente hace compra (SALE u ORDER)
  ↓
Calcular puntos según regla:
  - Si producto excluido → 0 puntos
  - Si monto < mínimo → 0 puntos
  - Puntos base = (monto / puntosPorPeso)
  - Multiplicador del tier
  - Puntos finales = base × multiplicador
  ↓
Crear LOYALTY_POINTS (tipo=ACUMULACION, puntos=+N)
  ↓
Verificar nuevo total
  ↓
Si alcanza nuevo tier → actualizar tier del cliente
  ↓
Notificar al cliente (email)
  ↓
Auditoría
```

## Canje de puntos

```
Cliente elige reward en su panel
  ↓
Backend valida:
  - puntos suficientes
  - nivel requerido (si aplica)
  - stock disponible
  - dentro de vigencia
  - límite por cliente
  ↓
Crea LOYALTY_REDEMPTION (estado=PENDIENTE)
  ↓
Descuento de puntos (LOYALTY_POINTS tipo=CANJE)
  ↓
Cliente aplica en próxima compra:
  - descuento % / monto
  - producto gratis
  - envío gratis
  ↓
Al completar venta → LOYALTY_REDEMPTION.estado = APLICADO
  ↓
Si vence sin usar → estado=EXPIRADO, devolver puntos
```

## Expiración de puntos

```
Cron diario busca puntos próximos a expirar
  ↓
T-30 días: email de aviso "Tienes N puntos por expirar"
  ↓
T-0: marca como expirados (LOYALTY_POINTS tipo=EXPIRACION)
  ↓
Descuento del balance
  ↓
Notificar
  ↓
Auditoría
```

## Bienvenida

```
Cliente hace primer pedido
  ↓
Si LOYALTY_PROGRAMS.activo y puntosBienvenida > 0:
  ↓
Crear LOYALTY_POINTS (tipo=BIENVENIDA)
  ↓
Notificar al cliente
```

## Cumpleaños

```
Cron diario busca clientes con cumpleaños hoy
  ↓
Si LOYALTY_PROGRAMS.activo y puntosPorCumpleanos > 0:
  ↓
Crear LOYALTY_POINTS (tipo=CUMPLEANOS)
  ↓
Email de felicitación + beneficios
```

---

# INTEGRACIÓN CON CRM

Detalle: [[CRM_CLIENTE.md]].

El CRM segmenta automáticamente:

- **VIP**: tier PLATINO o ORO.
- **FRECUENTE**: tier PLATA o BRONCE con > 5 compras.
- **NUEVO**: primera compra < 30 días.
- **INACTIVO**: sin compras en 60+ días.

## Datos en perfil de cliente

Mostrar:

- Puntos disponibles.
- Puntos por expirar.
- Nivel actual.
- Puntos para siguiente nivel.
- Total acumulado histórico.
- Rewards disponibles para su nivel.
- Historial de movimientos de puntos.

---

# PANEL DEL CLIENTE (futuro)

En MVP, el cliente no tiene cuenta, por lo que no tiene panel.

Cuando se implemente cuenta de cliente (fase 2):

- Ver puntos.
- Ver nivel.
- Ver rewards.
- Historial de movimientos.

Mientras tanto, los puntos se asocian por teléfono del cliente.

---

# REPORTES

- Puntos otorgados por período.
- Puntos canjeados.
- Puntos expirados.
- Tasa de uso de rewards.
- Distribución de clientes por nivel.
- ROI del programa (costo en puntos vs retención).

Detalle: [[REPORTES.md]].

---

# EVENTOS RELACIONADOS

- `puntos.acumulados`
- `puntos.canjeados`
- `puntos.expirados`
- `puntos.ajustados`
- `nivel.ascendido`
- `reward.canjeado`
- `reward.expirado`
- `cumpleanos.procesado`

Detalle: [[EVENTOS.md]].

---

# AUDITORÍA

- `LOYALTY_POINTS_AWARDED`
- `LOYALTY_POINTS_REDEEMED`
- `LOYALTY_POINTS_EXPIRED`
- `LOYALTY_TIER_CHANGED`
- `LOYALTY_PROGRAM_UPDATED`

Detalle: [[AUDITORIA.md]].

---

# ROLES Y PERMISOS

| Acción | ADMIN_NEGOCIO | SUPERVISOR | CAJERO |
|--------|---------------|------------|--------|
| Configurar programa | ✅ | ❌ | ❌ |
| Ver puntos de cliente | ✅ | ✅ | ✅ |
| Ajustar puntos manualmente | ✅ | ❌ | ❌ |
| Ver reportes | ✅ | ✅ | ❌ |
| Canjear en POS | ✅ | ✅ | ✅ |

Detalle: [[RBAC.md]].

---

# REGLAS CRÍTICAS

- Puntos SIEMPRE en integer (no decimales).
- Multiplicador del tier aplica DESPUÉS del cálculo base.
- Productos excluidos no acumulan, pero pueden ser comprados.
- Expiración de puntos es opcional (configurable).
- Cliente sin puntos = BRONCE = nivel base.
- Nivel nunca baja (solo sube).
- Reward expirado devuelve puntos automáticamente.
- Canje en venta POS requiere que la caja esté abierta.
- Puntos no transferibles entre tenants.
- Toda operación de puntos queda auditada.
