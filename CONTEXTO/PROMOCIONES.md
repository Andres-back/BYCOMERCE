# PROMOCIONES.md

# OBJETIVO

Definir el sistema de promociones, descuentos y cupones de Mocoa Market.

Alcance:

- Tipos de promociones.
- Aplicación a productos, categorías o pedidos.
- Vigencia.
- Cupones.
- Visualización.
- Reportes.
- Compatibilidad con POS, Catálogo, Marketplace, Domicilios.

Detalle de pagos: [[PAGOS.md]].

Detalle de fidelización: [[FIDELIZACION.md]].

---

# TIPOS DE PROMOCIONES

## Por tipo de descuento

### Porcentaje

- `descuento_pct`: 10%, 20%, etc.
- Calculado sobre el subtotal o sobre el ítem.

### Monto fijo

- `descuento_monto`: $5.000, $10.000, etc.
- En centavos (integer).

### Precio fijo

- `precio_promocional`: precio override.
- Reemplaza el precio del producto.

### 2x1, 3x2

- `tipo_promocion`: 2x1, 3x2, etc.
- `cantidad_paga`: cuántas unidades paga.
- `cantidad_lleva`: cuántas unidades recibe.

### Combo

- Conjunto de productos con precio especial.
- Ej: combo hamburguesa + papas + bebida por $15.000.

### Envío gratis

- Costo de domicilio = 0.
- Aplica a pedido (no a productos).

## Por alcance

- Global del tenant.
- Por categoría.
- Por producto.
- Por producto + variante.
- Por cliente (segmento).

## Por condición

- Sin condición (siempre aplica).
- Mínimo de compra ($50.000).
- Mínimo de items (3 unidades).
- Cliente nuevo.
- Cliente VIP.
- Primera compra.
- Día específico (lunes, viernes).
- Rango horario.

---

# MODELO DE DATOS

## PROMOTIONS (nueva)

```typescript
{
  id, tenantId,
  nombre, descripcion,
  tipo,  // PORCENTAJE, MONTO_FIJO, PRECIO_FIJO, N_X_M, COMBO, ENVIO_GRATIS
  alcance,  // GLOBAL, CATEGORIA, PRODUCTO, CLIENTE_SEGMENTO
  categoriaId (nullable),  // si alcance=CATEGORIA
  productoIds (text[]),  // si alcance=PRODUCTO
  segmento (nullable),  // NUEVO, FRECUENTE, VIP
  descuentoPct (nullable),
  descuentoMonto (nullable),
  precioPromocional (nullable),
  cantidadPaga (nullable, para NxM),
  cantidadLleva (nullable, para NxM),
  comboItems (JSON, para COMBO),
  montoMinimo (nullable),
  itemsMinimo (nullable),
  diasSemana (int[]),  // [1,5] = lunes y viernes, 0=domingo
  horaInicio, horaFin,
  fechaInicio, fechaFin,
  limiteUsosTotal (nullable),
  limiteUsosPorCliente (nullable),
  usosActuales (int, default 0),
  estado (ACTIVA, INACTIVA, AGOTADA, EXPIRADA),
  destacada (bool),  // para marketplace
  createdAt, updatedAt
}
```

## PROMOTION_PRODUCTS (pivote, nueva)

Para alcance mixto o combos.

```typescript
{
  id, promotionId, productId,
  cantidad,  // para combos
  required (bool)  // si es requerido en combo
}
```

## COUPONS (nueva)

```typescript
{
  id, tenantId,
  codigo,  // único dentro del tenant
  nombre, descripcion,
  tipo,  // igual a PROMOTIONS.tipo
  descuentoPct, descuentoMonto, etc,
  montoMinimo,
  usosMaximosTotal (nullable),
  usosMaximosPorCliente (nullable),
  usosActuales (int),
  clientesPermitidos (text[], nullable),  // si es cupón personal
  fechaInicio, fechaFin,
  estado (ACTIVO, INACTIVO, AGOTADO, EXPIRADO),
  createdAt
}
```

## COUPON_REDEMPTIONS (nueva)

Registro de uso de cupones.

```typescript
{
  id, couponId, customerId (nullable),
  saleId (nullable), orderId (nullable),
  montoDescuento,
  fecha
}
```

## ORDER_PROMOTIONS (aplicación, nueva)

Registro de qué promoción se aplicó a qué venta/pedido.

```typescript
{
  id, saleId (nullable), orderId (nullable),
  promotionId (nullable), couponId (nullable),
  montoDescuento,
  fecha
}
```

---

# FLUJOS

## Crear promoción

```
ADMIN_NEGOCIO crea promoción
  ↓
Define:
  - tipo, alcance
  - condición
  - vigencia
  - límites
  - estado inicial = ACTIVA
  ↓
Validar:
  - fechas coherentes
  - alcance con IDs válidos
  - descuentos coherentes
  ↓
Backend crea PROMOTIONS
  ↓
Auditoría: PROMOTION_CREATED
```

## Aplicar promoción automática en POS

```
Cajero agrega productos al carrito
  ↓
Backend consulta promociones aplicables:
  - vigentes (fechaInicio <= now <= fechaFin)
  - alcance = producto o categoría del item
  - cumple condición (montoMinimo, itemsMinimo, segmento)
  - estado = ACTIVA
  - limiteUsos no agotado
  ↓
Para cada item, calcular mejor descuento
  ↓
Aplicar al subtotal
  ↓
Mostrar desglose al cajero
  ↓
Al confirmar venta, registrar ORDER_PROMOTIONS
  ↓
Incrementar usosActuales
```

## Aplicar cupón

```
Cliente o cajero ingresa código de cupón
  ↓
Backend valida:
  - cupón existe y activo
  - vigente
  - usos disponibles
  - cumple condiciones
  - cliente elegible
  ↓
Calcula descuento
  ↓
Aplica al carrito
  ↓
Al confirmar, crea COUPON_REDEMPTION
  ↓
Incrementa usosActuales
```

## Cancelación de venta con promoción

```
Venta anulada o devuelta
  ↓
Identificar promociones aplicadas
  ↓
Decrementar usosActuales (o marcar como revertido)
  ↓
Si fue cupón, devolver el "uso"
  ↓
Auditoría
```

---

# APLICACIÓN EN CADA CANAL

## POS

- Mostrar promociones aplicables mientras se arma el carrito.
- Permitir aplicar cupón manualmente.
- Ver desglose de descuentos antes de cobrar.
- Reporte de promociones usadas en cierre de caja.

## Catálogo Digital

- Mostrar precio tachado + precio promocional.
- Badge "Oferta" o "X% off".
- Aplicar automáticamente en carrito.
- Cupón opcional al checkout.

## Marketplace

- Sección "Promociones" en home.
- Productos con promoción destacados.
- Filtrar por "En oferta".
- SEO: schema.org/Offer.

## Domicilios

- Mostrar promociones aplicables al carrito.
- Combinar con envío gratis.
- Cupón al confirmar.

---

# VISUALIZACIÓN

## En producto

```
┌──────────────────┐
│   [Imagen]       │
│  -20%  [Badge]   │
│                  │
│  $24.000         │  (tachado $30.000)
│  Antes $30.000   │
└──────────────────┘
```

## En carrito

```
Subtotal:           $50.000
Promo 2x1:        -$10.000
Cupón VERANO10:   -$5.000
─────────────────────────
Total:             $35.000
```

## En checkout

```
Total productos:    $50.000
Descuento promo:   -$10.000
Descuento cupón:   -$5.000
Domicilio:          $4.000
─────────────────────────
TOTAL A PAGAR:     $39.000
```

---

# COMBINACIÓN DE PROMOCIONES

Reglas MVP:

- Una promoción automática por producto/pedido (la mejor para el cliente).
- Un cupón adicional a las promociones automáticas.
- Sin stacking de promociones automáticas.

Ejemplo:

```
Promo 20% en categoría Zapatos (auto)
+ Cupón EXTRA5 ($5.000 fijo)
= Combinan, se aplican ambos
```

No combinar:

- 2x1 + 20% (escoger el mejor para el cliente).
- Cupón1 + Cupón2 (solo 1 cupón por venta).

---

# VALIDACIONES

## Backend

- Fechas de vigencia válidas.
- Descuento no excede el precio del producto.
- Límite de usos no excede lo definido.
- Estado coherente con fechas.
- Para combos: todos los productos existen y pertenecen al tenant.

## Negocio

- No se puede modificar el tipo de una promoción con usos.
- No se puede eliminar promoción con usos, solo desactivar.
- No se puede reducir `limiteUsosTotal` por debajo de `usosActuales`.

---

# REPORTES

- Promociones activas / inactivas.
- Promociones más usadas.
- Ingresos generados con vs sin promoción.
- Conversión de cupones.
- Cupones próximos a expirar.
- Promociones agotadas por límite de usos.
- ROI de cada promoción (descuento vs volumen).

Detalle: [[REPORTES.md]].

---

# EVENTOS RELACIONADOS

- `promocion.creada`
- `promocion.activada`
- `promocion.desactivada`
- `promocion.expirada`
- `promocion.agotada`
- `cupon.creado`
- `cupon.aplicado`
- `cupon.expirado`
- `cupon.agotado`
- `promocion.aplicada` (en venta/pedido)
- `promocion.revertida` (devolución/anulación)

Detalle: [[EVENTOS.md]].

---

# AUDITORÍA

- `PROMOTION_CREATED`
- `PROMOTION_UPDATED`
- `PROMOTION_DEACTIVATED`
- `COUPON_CREATED`
- `COUPON_APPLIED`
- `COUPON_REVERTED`

Detalle: [[AUDITORIA.md]].

---

# ROLES Y PERMISOS

| Acción | ADMIN_NEGOCIO | SUPERVISOR | CAJERO |
|--------|---------------|------------|--------|
| Crear promoción | ✅ | ❌ | ❌ |
| Editar promoción | ✅ | ❌ | ❌ |
| Desactivar promoción | ✅ | ❌ | ❌ |
| Crear cupón | ✅ | ❌ | ❌ |
| Aplicar cupón en venta | ✅ | ✅ | ✅ |
| Ver reporte de promociones | ✅ | ✅ | 🔶 |

Detalle: [[RBAC.md]].

---

# REGLAS CRÍTICAS

- Una sola promoción automática por producto/pedido (la mejor para el cliente).
- Un solo cupón por venta.
- Descuentos nunca mayores al subtotal.
- Toda promoción aplicada queda registrada con su ID.
- Cancelar/anular venta revierte la promoción.
- Cupón personal (de un cliente) solo aplica a ese cliente.
- Promociones expiradas se desactivan automáticamente (cron diario).
- Sin modificación destructiva de promociones con usos.
- Toda promoción visible solo dentro de su vigencia.
