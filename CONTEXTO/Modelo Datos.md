# MODELO_DATOS.md

# OBJETIVO

Definir las entidades principales de la plataforma.

Este documento es la fuente oficial para la construcción del esquema PostgreSQL y Prisma.

---

# TENANTS

Representa un comercio.

Campos:

- id
    
- nombre
    
- slug
    
- tipo_negocio
    
- plan_id
    
- telefono
    
- email
    
- direccion
    
- barrio
    
- ciudad
    
- latitud
    
- longitud
    
- logo
    
- estado
    
- created_at
    
- updated_at
    

---

# USERS

Usuarios del sistema.

Campos:

- id
    
- tenant_id
    
- nombre
    
- email
    
- password_hash
    
- rol
    
- estado
    
- ultimo_acceso
    
- created_at
    
- updated_at
    

---

# ROLES

Roles disponibles.

Campos:

- id
    
- nombre
    
- descripcion
    

Valores iniciales:

- SUPER_ADMIN
    
- ADMIN_NEGOCIO
    
- SUPERVISOR
    
- CAJERO
    
- DOMICILIARIO
    

---

# PLANS

Planes de suscripción.

Campos:

- id
    
- nombre
    
- precio
    
- limite_usuarios
    
- limite_productos
    
- almacenamiento_gb
    
- estado
    

---

# SUBSCRIPTIONS

Suscripciones activas.

Campos:

- id
    
- tenant_id
    
- plan_id
    
- fecha_inicio
    
- fecha_fin
    
- estado
    
- ultimo_pago
    

---

# CATEGORIES

Categorías de productos.

Campos:

- id
    
- tenant_id
    
- nombre
    
- descripcion
    
- estado
    

---

# PRODUCTS

Productos del inventario.

Campos:

- id
    
- tenant_id
    
- category_id
    
- sku
    
- barcode
    
- nombre
    
- descripcion
    
- marca
    
- costo
    
- precio
    
- stock
    
- stock_minimo
    
- imagen_principal
    
- estado
    
- created_at
    
- updated_at
    

---

# PRODUCT_IMAGES

Imágenes adicionales.

Campos:

- id
- product_id
- url
- orden

---

# PRODUCT_VARIANTS

Variantes de un producto (talla, color, presentación).

Campos:

- id
- tenant_id
- product_id
- sku
- nombre
- atributos (JSON: {talla, color, presentacion, etc})
- precio
- costo
- stock
- stock_reservado
- estado
- created_at
- updated_at

---

# PRODUCT_SUPPLIER

Relación producto-proveedor (un producto puede tener varios proveedores).

Campos:

- id
- tenant_id
- product_id
- supplier_id
- costo
- es_principal
- created_at
    

---

# SUPPLIERS

Proveedores.

Campos:

- id
    
- tenant_id
    
- nombre
    
- telefono
    
- email
    
- direccion
    
- observaciones
    

---

# PURCHASES

Compras realizadas.

Campos:

- id
    
- tenant_id
    
- supplier_id
    
- numero_factura
    
- total
    
- fecha_compra
    
- observaciones
    

---

# PURCHASE_ITEMS

Detalle de compras.

Campos:

- id
    
- purchase_id
    
- product_id
    
- cantidad
    
- costo_unitario
    
- subtotal
    

---

# INVENTORY_MOVEMENTS

Movimientos de inventario.

Campos:

- id
    
- tenant_id
    
- product_id
    
- tipo
    
- cantidad
    
- stock_anterior
    
- stock_nuevo
    
- observacion
    
- usuario_id
    
- fecha
    

Tipos:

- ENTRADA
- SALIDA
- AJUSTE
- DEVOLUCION
- PERDIDA

---

# STOCK_RESERVATIONS

Reservas de stock para pedidos en curso.

Permite separar el stock físico del stock disponible.

Campos:

- id
- tenant_id
- product_id
- variant_id (opcional)
- order_id
- cantidad
- estado (ACTIVA, LIBERADA, CONSUMIDA)
- fecha_expiracion
- created_at
- updated_at

---

# CASH_MOVEMENTS

Movimientos individuales dentro de una caja.

Tipos: VENTA, GASTO, INGRESO_MANUAL, AJUSTE, RETIRO, DEVOLUCION, APERTURA, CIERRE.

Campos:

- id
- tenant_id
- cash_register_id
- tipo
- monto
- descripcion
- referencia_id (sale_id, expense_id, etc)
- referencia_tipo
- usuario_id
- fecha
    

---

# CUSTOMERS

Clientes.

Campos:

- id
    
- tenant_id
    
- nombre
    
- telefono
    
- email
    
- direccion
    
- latitud
    
- longitud
    
- observaciones
    

---

# SALES

Ventas POS.

Campos:

- id
    
- tenant_id
    
- customer_id
    
- usuario_id
    
- subtotal
    
- descuento
    
- impuestos
    
- total
    
- metodo_pago
    
- fecha
    

---

# SALE_ITEMS

Detalle de venta.

Campos:

- id
    
- sale_id
    
- product_id
    
- cantidad
    
- precio_unitario
    
- subtotal
    

---

# CASH_REGISTERS

Apertura y cierre de caja.

Campos:

- id
    
- tenant_id
    
- usuario_id
    
- fecha_apertura
    
- fecha_cierre
    
- saldo_inicial
    
- saldo_final
    
- estado
    

---

# EXPENSES

Gastos.

Campos:

- id
    
- tenant_id
    
- usuario_id
    
- categoria
    
- descripcion
    
- valor
    
- comprobante_url
    
- fecha
    

---

# ORDERS

Pedidos web y domicilios.

Campos:

- id
    
- tenant_id
    
- customer_id
    
- subtotal
    
- costo_domicilio
    
- total
    
- estado
    
- direccion
    
- latitud
    
- longitud
    
- observaciones
    
- fecha
    

Estados:

- PENDIENTE
- CONFIRMADO
- PREPARANDO
- LISTO_PARA_ENTREGA
- EN_CAMINO
- ENTREGADO
- CANCELADO
    

---

# ORDER_ITEMS

Detalle del pedido.

Campos:

- id
    
- order_id
    
- product_id
    
- cantidad
    
- precio_unitario
    
- subtotal
    

---

# DELIVERY_CONFIG

Configuración de domicilios.

Campos:

- id
    
- tenant_id
    
- activo
    
- costo_base
    
- radio_km
    
- horario_inicio
    
- horario_fin
    

---

# BUSINESS_SETTINGS

Configuración del comercio.

Campos:

- id
    
- tenant_id
    
- logo
    
- banner
    
- whatsapp
    
- facebook
    
- instagram
    
- tiktok
    
- color_primario
    
- color_secundario
    

---

# AUDIT_LOGS

Registro de acciones críticas del sistema.

Campos:

- id
- tenant_id
- usuario_id
- accion
- entidad
- entidad_id
- old_value (JSON)
- new_value (JSON)
- ip
- user_agent
- fecha

---

# RELACIONES (FOREIGN KEYS)

Esta sección define formalmente las relaciones entre entidades.

## Núcleo multi-tenant

- USERS.tenant_id → TENANTS.id
- ROLES (catálogo global, sin tenant)
- TENANTS.plan_id → PLANS.id
- SUBSCRIPTIONS.tenant_id → TENANTS.id
- SUBSCRIPTIONS.plan_id → PLANS.id

## Catálogo

- CATEGORIES.tenant_id → TENANTS.id
- PRODUCTS.tenant_id → TENANTS.id
- PRODUCTS.category_id → CATEGORIES.id
- PRODUCT_IMAGES.product_id → PRODUCTS.id
- PRODUCT_VARIANTS.tenant_id → TENANTS.id
- PRODUCT_VARIANTS.product_id → PRODUCTS.id
- PRODUCT_SUPPLIER.tenant_id → TENANTS.id
- PRODUCT_SUPPLIER.product_id → PRODUCTS.id
- PRODUCT_SUPPLIER.supplier_id → SUPPLIERS.id

## Inventario y compras

- SUPPLIERS.tenant_id → TENANTS.id
- PURCHASES.tenant_id → TENANTS.id
- PURCHASES.supplier_id → SUPPLIERS.id
- PURCHASE_ITEMS.purchase_id → PURCHASES.id
- PURCHASE_ITEMS.product_id → PRODUCTS.id
- INVENTORY_MOVEMENTS.tenant_id → TENANTS.id
- INVENTORY_MOVEMENTS.product_id → PRODUCTS.id
- INVENTORY_MOVEMENTS.usuario_id → USERS.id
- STOCK_RESERVATIONS.tenant_id → TENANTS.id
- STOCK_RESERVATIONS.product_id → PRODUCTS.id
- STOCK_RESERVATIONS.variant_id → PRODUCT_VARIANTS.id
- STOCK_RESERVATIONS.order_id → ORDERS.id

## Clientes y ventas

- CUSTOMERS.tenant_id → TENANTS.id
- SALES.tenant_id → TENANTS.id
- SALES.customer_id → CUSTOMERS.id
- SALES.usuario_id → USERS.id
- SALE_ITEMS.sale_id → SALES.id
- SALE_ITEMS.product_id → PRODUCTS.id

## Caja

- CASH_REGISTERS.tenant_id → TENANTS.id
- CASH_REGISTERS.usuario_id → USERS.id
- CASH_MOVEMENTS.tenant_id → TENANTS.id
- CASH_MOVEMENTS.cash_register_id → CASH_REGISTERS.id
- CASH_MOVEMENTS.usuario_id → USERS.id

## Pedidos y domicilios

- ORDERS.tenant_id → TENANTS.id
- ORDERS.customer_id → CUSTOMERS.id
- ORDER_ITEMS.order_id → ORDERS.id
- ORDER_ITEMS.product_id → PRODUCTS.id
- DELIVERY_CONFIG.tenant_id → TENANTS.id

## Negocio y auditoría

- BUSINESS_SETTINGS.tenant_id → TENANTS.id
- EXPENSES.tenant_id → TENANTS.id
- EXPENSES.usuario_id → USERS.id
- AUDIT_LOGS.tenant_id → TENANTS.id
- AUDIT_LOGS.usuario_id → USERS.id

## Índices obligatorios

- Toda FK debe tener índice.
- Toda entidad multi-tenant debe tener índice compuesto (tenant_id, id).
- Toda búsqueda por tenant debe usar índice en (tenant_id, ...).
- Tablas geoespaciales: índice GIST en columnas geography/geometry.

---

# REGLAS

Toda entidad relacionada con negocios debe incluir:

- tenant_id

Toda relación debe estar indexada.

Todo movimiento de inventario debe generar auditoría.

Toda venta debe actualizar inventario.

Todo pedido debe actualizar inventario.

La base de datos debe mantener una única fuente de verdad para productos y stock.

Toda reserva de stock debe tener fecha de expiración configurable (default 30 minutos).

Todo movimiento de caja debe referenciar un cash_register activo.

Toda auditoría crítica debe capturar el estado anterior y posterior (old_value, new_value).