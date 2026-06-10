# POS.md

# OBJETIVO

Administrar las ventas físicas del comercio mediante un sistema de Punto de Venta (POS).

Este módulo debe ser rápido, intuitivo y optimizado para:

- Celulares Android.
    
- Tablets.
    
- Computadores.
    
- Pantallas táctiles.
    

---

# PRINCIPIO FUNDAMENTAL

Toda venta realizada desde POS debe:

- Registrar la venta.
    
- Actualizar inventario.
    
- Actualizar reportes.
    
- Registrar movimiento de caja.
    
- Generar auditoría.
    

La venta debe completarse en pocos pasos.

---

# INTERFAZ DE VENTA

La pantalla principal debe permitir:

- Buscar productos.
    
- Escanear código de barras.
    
- Agregar productos al carrito.
    
- Modificar cantidades.
    
- Aplicar descuentos.
    
- Finalizar venta.
    

---

# MÉTODOS DE BÚSQUEDA

Buscar por:

- Nombre.
    
- SKU.
    
- Código de barras.
    
- Categoría.
    

---

# ESCÁNER DE CÓDIGO DE BARRAS

Compatible con:

- Cámara del celular.
    
- Lectores USB.
    
- Lectores Bluetooth.
    

Al detectar un código:

- Buscar producto.
    
- Agregar automáticamente al carrito.
    

---

# CARRITO DE VENTA

Mostrar:

- Producto.
    
- Cantidad.
    
- Precio unitario.
    
- Subtotal.
    

Permitir:

- Aumentar cantidad.
    
- Disminuir cantidad.
    
- Eliminar producto.
    
- Aplicar descuento.
    

---

# CLIENTES

La venta podrá:

- Asociarse a cliente existente.
    
- Crear cliente rápido.
    
- Realizar venta sin cliente.
    

---

# FINALIZACIÓN DE VENTA

Calcular:

- Subtotal.
    
- Descuentos.
    
- Impuestos.
    
- Total.
    

Registrar:

- Cajero.
    
- Fecha.
    
- Hora.
    
- Método de pago.
    

---

# MÉTODOS DE PAGO

Iniciales:

- Efectivo.
    
- Transferencia.
    
- Tarjeta.
    
- Mixto.
    

---

# PAGO MIXTO

Ejemplo:

$20.000 efectivo

$30.000 transferencia

Total:

$50.000

---

# CAMBIO

Para pagos en efectivo:

Calcular automáticamente:

- Valor recibido.
    
- Cambio a entregar.
    

---

# RECIBOS

Generar:

- Ticket digital.
    
- PDF.
    

Opcional:

- Compartir por WhatsApp.
    

---

# CAJA

Cada venta debe estar asociada a una caja abierta.

---

# APERTURA DE CAJA

Registrar:

- Usuario.
    
- Fecha.
    
- Hora.
    
- Saldo inicial.
    

---

# CIERRE DE CAJA

Registrar:

- Saldo inicial.
    
- Ventas.
    
- Gastos.
    
- Saldo esperado.
    
- Saldo real.
    
- Diferencia.
    

---

# ARQUEO

Permitir:

- Verificación de efectivo.
    
- Verificación de diferencias.
    

---

# MOVIMIENTOS DE CAJA

Tipos:

- Venta.
    
- Gasto.
    
- Ingreso manual.
    
- Ajuste.
    
- Retiro.
    

---

# GASTOS

Permitir registrar:

- Categoría.
    
- Valor.
    
- Descripción.
    
- Fotografía comprobante.
    

Ejemplos:

- Transporte.
    
- Servicios.
    
- Insumos.
    
- Papelería.
    

---

# DEVOLUCIONES

Permitir:

- Devolución parcial.
    
- Devolución total.
    

Acciones:

- Reintegrar stock.
    
- Registrar auditoría.
    
- Registrar movimiento de caja.
    

---

# HISTORIAL DE VENTAS

Permitir consultar:

- Fecha.
    
- Cliente.
    
- Cajero.
    
- Total.
    
- Método de pago.
    

---

# ANULACIÓN DE VENTAS

Solo:

ADMIN_NEGOCIO

SUPERVISOR

Registrar:

- Motivo.
    
- Usuario.
    
- Fecha.
    

---

# REPORTES POS

Ventas del día.

Ventas por período.

Ventas por cajero.

Métodos de pago.

Productos vendidos.

Ticket promedio.

---

# DASHBOARD RÁPIDO

Mostrar:

- Ventas del día.
    
- Productos vendidos.
    
- Caja actual.
    
- Gastos del día.
    

---

# ROLES

## ADMIN_NEGOCIO

Acceso total.

---

## SUPERVISOR

Ventas.

Reportes.

Arqueos.

---

## CAJERO

Ventas.

Clientes.

Caja.

Sin acceso a configuraciones críticas.

---

# FUNCIONAMIENTO OFFLINE

Preparar arquitectura para futura implementación offline.

La versión inicial operará online.

---

# INTEGRACIONES

Inventario

Clientes

Reportes

Marketplace

Pedidos

Domicilios

Auditoría

---

# AUDITORÍA

Registrar:

- Aperturas.
    
- Cierres.
    
- Ventas.
    
- Anulaciones.
    
- Devoluciones.
    
- Gastos.
    

---

# REGLAS CRÍTICAS

No vender productos sin stock.

Toda venta debe afectar inventario.

Toda venta debe afectar caja.

Toda devolución debe restaurar inventario.

Toda anulación debe quedar auditada.

Toda caja debe tener apertura y cierre.

No permitir modificaciones directas a ventas cerradas.

---

# EVENTOS DEL SISTEMA

VENTA_REALIZADA

VENTA_ANULADA

DEVOLUCION_REALIZADA

CAJA_ABIERTA

CAJA_CERRADA

GASTO_REGISTRADO

Estos eventos serán utilizados por reportes, inventario y futuras automatizaciones.