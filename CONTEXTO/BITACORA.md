# BITACORA

Registro operativo de avances relevantes del MVP. Este archivo complementa la documentacion del cerebro y debe actualizarse cuando se cierre un bloque funcional importante.

---

## 2026-06-06 - Planes, suscripcion y limites backend MVP

### Contexto

Se reviso Obsidian/cerebro y el siguiente hueco backend critico era la capa SaaS multi tenant: planes publicos, suscripcion del tenant, limites por plan y bloqueo operativo cuando la suscripcion no esta vigente.

### Avance

Backend:

- Se creo `PlansModule`.
- `GET /api/v1/plans` lista planes activos publicos.
- `GET /api/v1/plans/:id` consulta un plan activo.
- Se agregaron rutas del cerebro para tenant manteniendo compatibilidad con `/api/v1/tenant/profile`.
- `GET /api/v1/tenants/me` y `PATCH /api/v1/tenants/me`.
- `GET /api/v1/tenants/me/settings` y `PATCH /api/v1/tenants/me/settings`.
- `GET /api/v1/tenants/me/subscription` devuelve suscripcion, plan, uso actual y limites.
- `POST /api/v1/tenants/me/subscription/change-plan` cambia plan validando uso actual contra limites destino.
- `POST /api/v1/tenants/me/subscription/cancel` cancela suscripcion, marca tenant cancelado y revoca refresh tokens.
- `GET /api/v1/tenants/me/subscription/payments` lista pagos/comprobantes de suscripcion.
- `POST /api/v1/tenants/me/subscription/payments` registra comprobante pendiente usando `Payment` tipo `SUBSCRIPTION`.
- Login ahora bloquea tenants sin suscripcion `ACTIVA`/`EN_PRUEBA` vigente.
- Inventario ahora valida `limiteProductos` antes de crear, importar o duplicar productos.

### Decision

Para el MVP no se crea todavia `SUBSCRIPTION_PAYMENTS`; se reutiliza `Payment` con `tipo = SUBSCRIPTION`, `referenciaId = subscription.id` y estado `PENDIENTE`. La confirmacion real queda para el modulo de superadmin/cobranza.

### Verificacion

- `npm run typecheck --workspace backend`: OK.
- `npm run lint --workspace backend`: OK.
- `npm run build --workspace backend`: OK.
- Smoke API real: pendiente por Postgres local no disponible.

### Pendiente proximo

- Crear modulo superadmin para confirmar pagos manuales, suspender/reactivar tenants e impersonar soporte.
- Agregar cron diario para vencer/suspender suscripciones automaticamente.
- Agregar frontend de suscripcion/planes en panel admin.
- Aplicar schema actualizado en Postgres cuando Docker este disponible.

---

## 2026-06-06 - Usuarios tenant backend MVP

### Contexto

Se continuo el cierre del backend multi tenant. El flujo de pedidos ya podia asignar domiciliarios, pero faltaba una API formal para que cada negocio administre sus usuarios operativos sin tocar usuarios de otros tenants.

### Avance

Backend:

- Se creo `UsersModule` y se registro en `AppModule`.
- Se agrego `UsersController` protegido por `JwtAuthGuard`, `RolesGuard` y rol `ADMIN_NEGOCIO`.
- `GET /api/v1/users` lista usuarios del tenant con filtros `q`, `rol` y `estado`.
- `GET /api/v1/users/:id` consulta un usuario del mismo tenant.
- `POST /api/v1/users/invite` crea usuario activo con clave temporal y `mustChangePassword`.
- `PATCH /api/v1/users/:id` actualiza nombre, email, rol y/o clave.
- `DELETE /api/v1/users/:id` y `POST /api/v1/users/:id/deactivate` desactivan usuario y revocan sesiones.
- `POST /api/v1/users/:id/activate` reactiva usuario respetando limite del plan.
- `POST /api/v1/users/:id/resend-invitation` genera nueva clave temporal, fuerza cambio de clave y revoca sesiones.
- Se bloquea `SUPER_ADMIN` dentro de usuarios tenant.
- Se evita desactivar el propio usuario admin.
- Se exige mantener al menos otro `ADMIN_NEGOCIO` activo antes de desactivar administradores.
- Se valida limite de usuarios activos del plan.
- Se registra auditoria de invitacion, actualizacion, activacion, desactivacion y reenvio.

### Decision

Para el MVP no se envia email real todavia. La invitacion devuelve una clave temporal una sola vez y fuerza cambio de contrasena en el siguiente acceso. Esto permite operar usuarios, cajeros y domiciliarios ya mismo mientras queda pendiente integrar correo transaccional.

### Verificacion

- `npm run typecheck --workspace backend`: OK.
- `npm run lint --workspace backend`: OK.
- `npm run build --workspace backend`: OK.
- Smoke API real: pendiente por Postgres local no disponible.

### Pendiente proximo

- Crear pantalla frontend `/admin/users` para administrar usuarios tenant.
- Integrar envio real de invitaciones por email.
- Aplicar schema actualizado en Postgres cuando Docker este disponible.
- Reintentar smoke API real de usuarios, pedidos y POS.

---

## 2026-06-05 - Pedidos, domiciliario y cobro contra entrega MVP

### Contexto

Se continuo el cierre del flujo de domicilios definido en el cerebro: todo domicilio nace de un pedido, puede asignarse manualmente a un domiciliario y al entregarse debe consumir inventario, registrar pago manual/contra entrega, mover caja y dejar auditoria por tenant.

### Avance

Backend:

- `Order` ahora guarda `deliveryUserId`, `deliveryAssignedAt`, `deliveredAt` y `metodoPago`.
- Relacion `User.assignedOrders` para usuarios `DOMICILIARIO`.
- `GET /api/v1/orders/delivery-users`.
- `POST /api/v1/orders/:id/assign-delivery`.
- `POST /api/v1/orders/:id/deliver` ahora acepta `metodoPago`, `montoRecibido`, `referenciaExterna` y `motivo`.
- Asignacion valida que el usuario sea `DOMICILIARIO`, activo y del mismo tenant.
- Entrega registra `Payment` tipo `ORDER` en estado `COMPLETADO`.
- Entrega crea/aprovecha caja abierta del usuario y registra `CashMovement` tipo `VENTA`.
- Entrega consume reserva de stock e inventario con `InventoryMovement` tipo `SALIDA`.
- Domiciliario no puede cerrar pedidos asignados a otro domiciliario.
- Auditoria para asignacion, transiciones y entrega/cobro.

Frontend:

- `/admin/orders` muestra domiciliario asignado.
- Selector de domiciliario para pedidos en proceso.
- Accion `Asignar`.
- Formulario `Cobro contra entrega` para pedidos `EN_CAMINO`.
- Metodo de pago manual: contra entrega, efectivo, transferencia o tarjeta.
- Monto recibido en centavos y referencia opcional.
- Boton `Entregar y cobrar`.
- Estilos responsive para asignacion y cobro sin tarjetas anidadas.

### Decision

Para el MVP se usa la tabla generica `Payment` ya prevista en el cerebro, con `tipo = ORDER` y `referenciaId = order.id`. No se agrega pasarela online ni datos de tarjeta; todo es registro manual.

### Verificacion

- `npm exec --workspace backend prisma -- format --schema prisma/schema.prisma`: OK.
- `npm run prisma:generate --workspace backend`: OK.
- `npm run typecheck --workspace backend`: OK.
- `npm run typecheck --workspace frontend`: OK.
- `npm run lint --workspace backend`: OK.
- `npm run lint --workspace frontend`: OK con warnings previos de `<img>` en marketplace/catalogo.
- `npm run build`: OK.
- `http://localhost:3000/admin/orders`: devuelve 302 a login sin sesion; el build generado contiene `Asignacion de entrega`, `Cobro contra entrega`, `Entregar y cobrar`, `orders/delivery-users` y `assign-delivery`.
- Smoke API real: pendiente por Postgres local no disponible.

### Pendiente proximo

- Aplicar schema actualizado en Postgres cuando Docker este disponible.
- Reintentar smoke API real de pedidos/asignacion/entrega/cobro.
- Crear administracion formal de usuarios/domiciliarios.
- Mejorar comprobantes de pago con carga de archivo cuando MinIO este activo.

---

## 2026-06-05 - Devoluciones y anulacion POS MVP

### Contexto

Se continuo el cierre del POS segun el cerebro: una venta debe poder anularse o devolverse parcial/totalmente, reintegrando inventario, ajustando caja y dejando auditoria por tenant. El inventario sigue siendo la fuente de verdad y el frontend opera siempre por API.

### Avance

Backend:

- Se agrego `estado` a `Sale`.
- Se agregaron modelos `SaleRefund` y `SaleRefundItem`.
- `GET /api/v1/sales/:id`.
- `POST /api/v1/sales/:id/void`.
- `POST /api/v1/sales/:id/refund`.
- Anulacion restringida a `ADMIN_NEGOCIO` y `SUPERVISOR`.
- Devolucion parcial/total valida cantidades disponibles por item.
- Devolucion reintegra `Product.stock`.
- Devolucion genera `InventoryMovement` tipo `DEVOLUCION`.
- Devolucion genera `CashMovement` tipo `DEVOLUCION`.
- Anulacion marca la venta como `CANCELADO` cuando se reversa completa.
- Auditoria para anulacion y devolucion.
- Reportes ajustados para ventas netas: ventas activas menos devoluciones, top productos/clientes y costo estimado neto.

Frontend:

- Servicio POS actualizado con `getSale`, `voidSale` y `refundSale`.
- Tipos `SaleRefund` y `SaleRefundItem`.
- `/admin/pos` ahora carga ventas recientes junto con productos y clientes.
- Nueva seccion `Ventas recientes`.
- Accion `Anular`.
- Panel `Devolucion parcial` por item.
- Validacion visual de cantidad maxima devolvible.
- Estilos responsive para historial POS y formulario de devolucion.

### Decision

Se modelaron las devoluciones como entidad propia y no como venta negativa. Esto conserva trazabilidad de la venta original, permite devoluciones parciales y mantiene caja/reportes calculados de forma neta sin borrar historial.

El cambio requiere aplicar el schema a Postgres (`prisma db push` o migracion equivalente). La base local no pudo actualizarse porque Docker/Postgres sigue detenido en esta sesion.

### Verificacion

- `npm run prisma:generate --workspace backend`: OK.
- `npm run typecheck --workspace backend`: OK.
- `npm run lint --workspace backend`: OK.
- `npm run typecheck --workspace frontend`: OK.
- `npm run lint --workspace frontend`: OK con warnings previos de `<img>` en marketplace/catalogo.
- `npm run build`: OK.
- `http://localhost:3000/admin/pos`: devuelve 302 a login sin sesion; el build generado contiene `Ventas recientes`, `Devolucion parcial` y `Anular`.
- Smoke API real: pendiente por Postgres local no disponible; Docker Desktop sigue detenido y esta sesion no puede iniciar `com.docker.service`.

### Pendiente proximo

- Levantar Docker/Postgres.
- Aplicar schema actualizado.
- Reintentar smoke API real de ventas, anulacion y devolucion.
- Agregar impresion/descarga de recibo si el negocio lo requiere.

---

## 2026-06-05 - Configuracion publica del negocio

### Contexto

Se continua la construccion del MVP multi-tenant tomando `lopbuk_gastrobar` como referencia funcional, pero manteniendo el stack oficial de Mocoa Market:

- NestJS.
- Next.js.
- Prisma.
- PostgreSQL.
- Inventario como fuente de verdad.
- Frontend siempre via API.

### Avance

Se agrego el modulo administrativo para que cada tenant configure su presencia publica sin tocar codigo.

Backend:

- Nuevo modulo `tenants`.
- `GET /api/v1/tenant/profile`.
- `PATCH /api/v1/tenant/profile`.
- Actualizacion de `Tenant`, `BusinessSettings` y `DeliveryConfig`.
- Registro de auditoria `NEGOCIO_CONFIGURACION_ACTUALIZADA`.
- Filtrado por tenant desde JWT.

Frontend:

- Nueva pantalla `/admin/settings`.
- Edicion de nombre, tipo de negocio, contacto, ubicacion, logo, banner, redes, colores y domicilios.
- Vista previa de la vitrina.
- Navegacion admin actualizada.

### Decision

No se crea una tabla nueva para storefront. La configuracion publica del comercio vive en:

- `Tenant`: datos base del negocio.
- `BusinessSettings`: identidad visual y redes.
- `DeliveryConfig`: reglas de domicilio.

Esto evita duplicar datos y mantiene marketplace/catalogo conectados al cerebro central.

### Pendiente proximo

- Crear pagina publica tipo links por negocio.
- Mejorar checkout con enlace WhatsApp y resumen compartible.
- Agregar carga real de imagenes con MinIO.
- Convertir warnings de `<img>` a `next/image` con `remotePatterns`.

---

## 2026-06-05 - Reportes operativos MVP

### Contexto

El cerebro define que los reportes no deben almacenar informacion propia ni duplicar datos. Deben calcularse desde inventario, POS, clientes, pedidos, caja y gastos, siempre filtrando por `tenant_id`.

### Avance

Backend:

- Nuevo modulo `reports`.
- `GET /api/v1/reports/dashboard`.
- `GET /api/v1/reports/sales`.
- `GET /api/v1/reports/products`.
- `GET /api/v1/reports/inventory`.
- `GET /api/v1/reports/customers`.
- Filtros opcionales `from` y `to` para reportes con rango.
- KPIs calculados: ventas dia, ventas mes, ventas del rango, crecimiento, ticket promedio, utilidad estimada, pedidos activos, clientes, alertas de stock, valor de inventario y caja estimada.

Frontend:

- Nuevo dashboard administrativo en `/admin`.
- Tarjetas KPI.
- Top productos vendidos.
- Pedidos recientes.
- Alertas de inventario.
- Menu admin actualizado con Dashboard.

### Decision

No se crearon tablas agregadas ni snapshots de reportes en MVP. Los indicadores se calculan bajo demanda usando Prisma sobre las tablas oficiales.

### Pendiente proximo

- Completar CRM clientes con CRUD administrativo e historial.
- Agregar exportaciones CSV/Excel para reportes.
- Implementar reportes de gastos cuando exista pantalla de gastos.
- Añadir tests de aislamiento multi-tenant para reportes.

---

## 2026-06-05 - CRM clientes MVP

### Contexto

El cerebro define que cada cliente pertenece a un tenant y que no deben duplicarse clientes por telefono. Tambien pide historial de compras, pedidos, busqueda y datos comerciales calculados.

### Avance

Backend:

- Nuevo modulo `customers`.
- `GET /api/v1/customers`.
- `POST /api/v1/customers`.
- `GET /api/v1/customers/:id`.
- `PATCH /api/v1/customers/:id`.
- `DELETE /api/v1/customers/:id` solo permitido si el cliente no tiene ventas ni pedidos.
- `GET /api/v1/customers/:id/history`.
- Normalizacion de telefono a digitos.
- Validacion de telefono unico por tenant.
- Segmentacion calculada: `NUEVO`, `FRECUENTE`, `VIP`, `INACTIVO`.
- Estadisticas calculadas desde POS y pedidos entregados: total gastado, compras, ticket promedio, ultima compra, ventas POS y pedidos entregados.
- Auditoria `CLIENTE_CREADO`, `CLIENTE_ACTUALIZADO`, `CLIENTE_ELIMINADO`.

Frontend:

- Nueva pantalla `/admin/customers`.
- Busqueda por nombre, telefono o email.
- Filtros por segmento.
- Formulario de creacion y edicion.
- Perfil con contacto, estadisticas, ventas POS y pedidos.
- Menu admin actualizado con Clientes.

### Decision

No se creo una tabla CRM nueva. El cliente sigue viviendo en `Customer` y el historial se calcula desde `Sale` y `Order`. La eliminacion fisica solo se permite cuando no hay historial; soft delete queda pendiente de esquema porque `Customer` todavia no tiene campo `estado` o `deletedAt`.

### Pendiente proximo

- Asociar cliente desde POS con busqueda/seleccion en la venta.
- Agregar direcciones multiples y barrio/ciudad al modelo cuando se haga la siguiente migracion.
- Crear tags/notas avanzadas de CRM.
- Agregar exportacion de clientes.

---

## 2026-06-05 - Integracion POS con CRM

### Contexto

El CRM debe alimentarse desde POS, pedidos, marketplace y catalogo. Hasta este punto POS aceptaba `customerId`, pero la interfaz no permitia buscar ni crear cliente rapido durante la venta.

### Avance

Backend:

- `POST /api/v1/sales` ahora acepta:
  - `customerId` para asociar una venta a un cliente existente del mismo tenant.
  - `customer` para crear o actualizar rapidamente un cliente por telefono.
- Validacion de pertenencia del cliente al tenant.
- Normalizacion de telefono a digitos.
- Bloqueo si se envian `customerId` y `customer` al mismo tiempo.
- Auditoria de venta incluye metadata `customerId` cuando aplica.

Frontend:

- POS permite buscar clientes del tenant.
- POS permite seleccionar cliente existente.
- POS permite registrar cliente rapido con nombre, telefono, email y direccion.
- Al finalizar venta, la venta queda asociada al cliente y alimenta el historial del CRM.

### Decision

La fuente de verdad del cliente sigue siendo `Customer`. POS no crea una entidad paralela; usa el mismo CRM mediante `customerId` o upsert por telefono.

### Pendiente proximo

- Mostrar en POS un historial breve del cliente seleccionado.
- Agregar recibo/ticket con datos del cliente.
- Soportar cliente frecuente con descuentos o puntos cuando se implemente fidelizacion.

---

## 2026-06-05 - Caja y gastos MVP

### Contexto

El cerebro define que POS, caja, gastos y reportes deben compartir la misma fuente de verdad del tenant. El sistema ya tenia las tablas `CashRegister`, `CashMovement` y `Expense`, por lo que no se creo una migracion nueva.

### Avance

Backend:

- Nuevo modulo `finance`.
- `GET /api/v1/cash-registers`.
- `GET /api/v1/cash-registers/current`.
- `POST /api/v1/cash-registers/open`.
- `GET /api/v1/cash-registers/:id`.
- `POST /api/v1/cash-registers/:id/close`.
- `GET /api/v1/cash-registers/:id/movements`.
- `POST /api/v1/cash-registers/:id/movements`.
- `GET /api/v1/expenses`.
- `POST /api/v1/expenses`.
- `GET /api/v1/expenses/:id`.
- `PATCH /api/v1/expenses/:id`.
- `DELETE /api/v1/expenses/:id`.
- Apertura de caja con movimiento `APERTURA`.
- Cierre de caja con calculo de saldo esperado y diferencia.
- Gastos conectados a caja mediante movimiento `GASTO`.
- Movimientos manuales permitidos: `INGRESO_MANUAL`, `AJUSTE` y `RETIRO`.
- Bloqueo de edicion/eliminacion de gastos asociados a cajas cerradas.
- Auditoria para apertura, cierre, movimientos y gastos.

Frontend:

- Nueva pantalla `/admin/cash`.
- KPIs de estado, saldo esperado y gastos del dia.
- Formulario de apertura de caja.
- Formulario de cierre de caja.
- Formulario de movimiento manual.
- Formulario de registro de gasto.
- Listados de movimientos recientes, historial de cajas y gastos recientes.
- Menu admin actualizado con Caja.

Reportes:

- La caja estimada trata `CIERRE` como movimiento neutral.
- `GASTO`, `RETIRO` y `DEVOLUCION` restan del balance.

### Decision

Los gastos no duplican estado financiero. `Expense` guarda el comprobante administrativo y `CashMovement` mantiene el impacto en caja. Si no hay caja abierta al registrar un gasto, el backend crea una caja abierta con saldo inicial cero, igual que el comportamiento operativo del POS.

### Verificacion

- `npm run typecheck --workspace backend`: OK.
- `npm run typecheck --workspace frontend`: OK.
- `npm run lint --workspace backend`: OK.
- `npm run lint --workspace frontend`: OK con warnings previos de `<img>` en marketplace/catalogo.
- `npm run build`: OK.
- `http://localhost:3000/admin/cash`: OK, pantalla renderizada en navegador integrado.
- Smoke API de caja/gastos: pendiente porque Postgres local no esta disponible. Docker Desktop esta detenido y esta sesion no tiene permiso para iniciar el servicio `com.docker.service`.

### Pendiente proximo

- Reintentar smoke API cuando Postgres/Docker este levantado.
- Agregar exportacion CSV/Excel de gastos y cierres de caja.
- Agregar filtros por fecha/categoria en la pantalla de caja.
- Mostrar detalle de arqueo antes de confirmar cierre.

---

## 2026-06-05 - Inventario administrativo completo MVP

### Contexto

El cerebro define Inventario como fuente unica de verdad para POS, catalogo, marketplace, pedidos y reportes. El modulo existente solo permitia listar/crear productos y categorias; faltaban edicion, desactivacion, movimientos y ajuste formal de stock.

### Avance

Backend:

- `GET /api/v1/categories/:id`.
- `PATCH /api/v1/categories/:id`.
- `DELETE /api/v1/categories/:id` con desactivacion por `estado = INACTIVO`.
- Bloqueo para desactivar categorias con productos activos.
- `PATCH /api/v1/products/:id`.
- `DELETE /api/v1/products/:id` con desactivacion por `estado = INACTIVO`.
- `POST /api/v1/products/:id/duplicate`.
- `GET /api/v1/products/:id/movements`.
- `POST /api/v1/products/:id/adjust-stock`.
- Filtros de productos por busqueda, categoria y estado de stock.
- Validacion de categoria por tenant.
- Validacion de SKU y codigo de barras unicos por tenant.
- Stock editable solo mediante movimiento de inventario.
- Movimientos soportados: `ENTRADA`, `SALIDA`, `AJUSTE`, `DEVOLUCION`, `PERDIDA`.
- Bloqueo de movimientos que dejen stock negativo.
- Auditoria para crear/editar/desactivar/duplicar productos, categorias y ajustar stock.

Frontend:

- Pantalla `/admin/inventory` reemplazada por una operacion administrativa completa.
- KPIs de productos, unidades y valor a costo.
- Filtros por busqueda, categoria y estado de stock.
- Formulario de producto con categoria, SKU, codigo, marca, precios, stock minimo, imagen, destacado y descripcion.
- Stock inicial solo al crear producto.
- Ajuste de stock del producto seleccionado con historial de movimientos.
- Formulario CRUD de categorias.
- Acciones de editar, duplicar y desactivar producto.

### Decision

`PATCH /products/:id` no modifica `stock`. Cualquier cambio de stock debe pasar por `POST /products/:id/adjust-stock` para crear `InventoryMovement` y mantener trazabilidad.

Los borrados administrativos son soft delete usando `estado = INACTIVO`; no se eliminan filas de productos/categorias para no romper ventas, pedidos, catalogos historicos ni reportes.

### Verificacion

- `npm run typecheck --workspace backend`: OK.
- `npm run lint --workspace backend`: OK.
- `npm run typecheck --workspace frontend`: OK.
- `npm run lint --workspace frontend`: OK con warnings previos de `<img>` en marketplace/catalogo.
- `npm run build`: OK.
- `http://localhost:3000/admin/inventory`: OK, pantalla renderizada en navegador integrado.
- Smoke API real: pendiente por Postgres local no disponible; Docker Desktop sigue detenido y esta sesion no puede iniciar `com.docker.service`.

### Pendiente proximo

- Reintentar smoke API de inventario cuando Postgres/Docker este levantado.
- Agregar importacion/exportacion CSV/Excel de productos.
- Implementar variantes y atributos dinamicos del producto.
- Implementar proveedores y compras para entradas automaticas.

---

## 2026-06-05 - Proveedores y compras MVP

### Contexto

El cerebro define que las compras deben aumentar inventario automaticamente y generar movimiento tipo `ENTRADA`. Hasta este bloque, las entradas de stock dependian de stock inicial o ajuste manual.

### Avance

Backend:

- Nuevos endpoints `suppliers`:
  - `GET /api/v1/suppliers`.
  - `POST /api/v1/suppliers`.
  - `GET /api/v1/suppliers/:id`.
  - `PATCH /api/v1/suppliers/:id`.
  - `DELETE /api/v1/suppliers/:id`.
- Nuevos endpoints `purchases`:
  - `GET /api/v1/purchases`.
  - `POST /api/v1/purchases`.
  - `GET /api/v1/purchases/:id`.
  - `POST /api/v1/purchases/:id/cancel`.
- Registro de compra con proveedor opcional, factura, fecha, observaciones e items.
- Calculo de total desde items, no desde el cliente frontend.
- Al registrar compra:
  - Crea `Purchase`.
  - Crea `PurchaseItem`.
  - Incrementa `Product.stock`.
  - Actualiza `Product.costo` al costo unitario comprado.
  - Crea `InventoryMovement` tipo `ENTRADA`.
  - Actualiza/asocia `ProductSupplier`.
- Al anular compra:
  - Reversa stock con movimiento tipo `SALIDA`.
  - Bloquea anulacion si el producto quedaria en negativo.
  - Marca compra como `CANCELADO`.
- Auditoria para proveedores y compras.

Frontend:

- Nueva pantalla `/admin/purchases`.
- Menu admin actualizado con Compras.
- Formulario de proveedor.
- Busqueda/listado de proveedores.
- Formulario de compra con multiples items.
- Total calculado en pantalla.
- Historial de compras con filtros por proveedor y fechas.
- Accion de anular compra.

### Decision

Se agrego `estado` a `Supplier` y `Purchase` en Prisma para soportar soft delete de proveedores y anulacion de compras sin eliminar historial. El proyecto no tenia carpeta de migraciones, por lo que queda pendiente aplicar el cambio de schema en la base con `prisma db push` o migracion equivalente cuando Postgres/Docker este disponible.

### Verificacion

- `npm run prisma:generate --workspace backend`: OK.
- `npm run typecheck --workspace backend`: OK.
- `npm run lint --workspace backend`: OK.
- `npm run typecheck --workspace frontend`: OK.
- `npm run lint --workspace frontend`: OK con warnings previos de `<img>` en marketplace/catalogo.
- `npm run build`: OK.
- `http://localhost:3000/admin/purchases`: OK, pantalla renderizada en navegador integrado.
- Smoke API real: pendiente por Postgres local no disponible; Docker Desktop sigue detenido y esta sesion no puede iniciar `com.docker.service`.

### Pendiente proximo

- Aplicar schema actualizado a Postgres cuando Docker este levantado.
- Reintentar smoke API de proveedores/compras.
- Agregar pagos de compras/cuentas por pagar si el negocio lo requiere.
- Agregar exportacion de compras.

---

## 2026-06-05 - Importacion y exportacion CSV de inventario

### Contexto

El cerebro define importacion masiva y exportacion de inventario como parte del modulo. El API tambien tenia previstos `POST /products/import` y `GET /products/export`.

### Avance

Backend:

- `GET /api/v1/products/export`.
- `POST /api/v1/products/import`.
- Exportacion con filtros existentes de producto: busqueda, categoria y estado de stock.
- Exportacion devuelve CSV con columnas:
  - `nombre`.
  - `sku`.
  - `barcode`.
  - `categoria`.
  - `marca`.
  - `descripcion`.
  - `costo`.
  - `precio`.
  - `stock`.
  - `stockMinimo`.
  - `imagenPrincipal`.
  - `destacado`.
- Importacion acepta hasta 500 productos por lote.
- Importacion puede crear categoria automaticamente usando `categoria`/`categoryName`.
- Cada producto importado pasa por la misma regla de `createProduct`, por lo que genera auditoria y movimiento `ENTRADA` si trae stock inicial.
- Resultado de importacion separa filas creadas y omitidas con razon.
- Auditoria `PRODUCTS_EXPORTED` y `PRODUCTS_IMPORTED`.

Frontend:

- Boton `Importar CSV` en `/admin/inventory`.
- Boton `Exportar CSV` en `/admin/inventory`.
- Parser CSV basico con soporte de comillas y comas en texto.
- Mensaje de resultado con creados y omitidos.
- Descarga de CSV desde contenido generado por backend.

### Decision

No se agrego carga directa de archivo en backend para evitar introducir Multer/storage antes de MinIO. En MVP, el navegador lee el CSV y envia JSON tipado al backend. La fuente de verdad y las reglas siguen en backend.

### Verificacion

- `npm run typecheck --workspace backend`: OK.
- `npm run lint --workspace backend`: OK.
- `npm run typecheck --workspace frontend`: OK.
- `npm run lint --workspace frontend`: OK con warnings previos de `<img>` en marketplace/catalogo.
- `npm run build`: OK.
- `http://localhost:3000/admin/inventory`: OK, botones `Importar CSV` y `Exportar CSV` visibles en navegador integrado.
- Smoke API real: pendiente por Postgres local no disponible.

### Pendiente proximo

- Probar import/export contra base real cuando Docker/Postgres este disponible.
- Agregar plantilla descargable vacia.
- Agregar importacion Excel cuando se active manejo formal de archivos.

---

## 2026-06-10 - Version 1.0 completa: 24 vistas, RBAC, GSAP, iconos premium

### Contexto

El proyecto alcanzo su version 1.0 completa con todos los modulos documentados implementados y funcionales.

### Avance

**Modulos nuevos implementados:**
- `Promociones` (backend + frontend): CRUD de promociones y cupones, 4 modelos Prisma, 8 endpoints.
- `Fidelizacion` (backend + frontend): programa de puntos, niveles, recompensas, historial por cliente.
- `Sucursales` (backend + frontend): CRUD de sucursales, geolocalizacion, horarios.
- `Ruta de entrega`: endpoint de optimizacion nearest-neighbor, mapa Leaflet con marcadores numerados y linea de ruta.

**Mejoras UX:**
- Paleta de comandos global (Cmd+K) para navegacion rapida entre modulos.
- Breadcrumbs de navegacion en Dashboard, Clientes, Inventario, Pedidos, POS, Reportes, Settings.
- Atajos de teclado en POS (F2 cobrar, F4 pago, Ctrl+F buscar, Ctrl+N nueva venta, Esc cancelar).
- Transiciones de pagina con GSAP (fade + slide en cada navegacion).
- Animaciones de entrada con ScrollTrigger (cards aparecen escalonadas al hacer scroll).
- Indicador visual de atajos en POS.

**RBAC implementado:**
- ADMIN_NEGOCIO: 17 modulos (todo).
- SUPERVISOR: 11 modulos (sin Compras, Usuarios, Planes, Configuracion, Sucursales).
- CAJERO: 3 modulos (POS, Caja, Notificaciones).
- DOMICILIARIO: 2 modulos (Pedidos, Notificaciones).

**Iconos:**
- Integrados 28 SVG iconos premium personalizados en `public/icons/`.
- Componente `AppIcon` con mapeo automatico nombre→archivo.
- Favicon PNG personalizado.

**Diseno responsivo:**
- Todas las vistas con `grid-cols-1` base + breakpoints.
- Sidebar colapsable en mobile con Sheet.
- Tablas con `overflow-x-auto` para scroll horizontal.
- Marketplace con `max-w-7xl` y grid adaptable (1→5 columnas).
- Vista de productos dedicada en `/marketplace`.

**GSAP:**
- Animaciones en todas las vistas con `<FadeIn>` y `<StaggerList>`.
- Transiciones de pagina con `template.tsx`.

**Stack final:**
- Backend: NestJS + Prisma + PostgreSQL (24 modulos, 150+ endpoints).
- Frontend: Next.js 16 + shadcn/ui + Tailwind v4 (24 vistas, 19 paginas admin).
- Iconos: 28 SVG premium personalizados.
- Animaciones: GSAP + ScrollTrigger.
- Mapas: Leaflet para rutas de entrega.

### Validacion
- `npm run build --workspace backend`: OK.
- `npm run build --workspace frontend`: OK, 24 rutas generadas.
- `http://localhost:3000`: todas las paginas HTTP 200.
- Login con 4 roles funcionales.

### Pendiente
- Integracion con pasarela de pagos Stripe/PayU.
- Facturador electronico DIAN.
- Modo offline con Service Worker.
- E2E tests con Playwright.
- Deployment a produccion con Docker Compose.

---

## 2026-06-11 - UI admin y modo oscuro consistente

### Contexto

Se reviso el cerebro/Obsidian y se continuo sobre el MVP multi-tenant. El foco de esta tanda fue mejorar el modo oscuro y alinear las vistas admin solicitadas: promociones, inventario, clientes y compras/proveedores.

### Cambios

- Modo oscuro corregido en admin:
  - `BrandingProvider` ya no pisa el tema del usuario dentro de `/admin`.
  - `ThemeProvider` sincroniza explicitamente las clases `dark`/`light` en `<html>`.
  - Se elimino el toggle flotante dentro del admin para dejar un unico control en el header.
  - Se corrigieron colores de texto, iconos, botones, inputs, tablas y cards con tokens semanticos.
- Redisenadas las vistas:
  - `/admin/promotions`: metricas superiores, tabs, buscador, filtros, tabla y estado vacio tipo referencia.
  - `/admin/inventory`: metricas, toolbar, filtros, tabla y estado vacio mejorado.
  - `/admin/customers`: metricas, filtros de segmento, buscador, avatares iniciales y tabla/estado vacio.
  - `/admin/purchases`: metricas, acciones principales, tabs compras/proveedores, filtros y estados vacios.
- Componentes compartidos ajustados:
  - `PageHeader`, `AdminPageLayout`, `Breadcrumbs`, `StatCard`, `DataTable`, `EmptyState`, `Card`, `Input`, `Table`, `Button`, `Tabs`.

### Validacion

- `npm run typecheck --workspace frontend`: OK.
- `npm run build --workspace frontend`: OK.
- `localhost:3000/admin/promotions`: HTTP 200 tras reiniciar `next start -p 3000`.
- Verificacion en navegador integrado:
  - `html.dark` se mantiene al navegar entre `/admin/promotions`, `/admin/inventory`, `/admin/customers` y `/admin/purchases`.
  - Cards, tablas, titulos, inputs y botones reportan fondo oscuro/texto claro en modo dark.
  - El toggle flotante ya no aparece en admin.

### Pendiente

- El comando de screenshot del navegador integrado expiro al capturar, pero la validacion DOM/computed paso.
- Queda deuda global previa de estilos hardcodeados en otras vistas admin no incluidas en esta tanda, especialmente dashboard/superadmin.
