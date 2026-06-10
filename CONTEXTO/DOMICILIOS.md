# DOMICILIOS.md

# OBJETIVO

Permitir a los comercios recibir, gestionar y entregar pedidos a domicilio mediante una plataforma centralizada.

El sistema debe facilitar:

- Recepción de pedidos.
    
- Gestión de entregas.
    
- Geolocalización.
    
- Seguimiento.
    
- Comunicación con el cliente.
    

---

# PRINCIPIO FUNDAMENTAL

Todo domicilio nace desde un pedido.

No existen domicilios sin pedido asociado.

---

# FLUJO GENERAL

Cliente  
↓  
Catálogo Digital / Marketplace  
↓  
Pedido  
↓  
Confirmación Comercio  
↓  
Preparación  
↓  
Asignación Domiciliario  
↓  
Entrega  
↓  
Finalización

---

# CREACIÓN DEL PEDIDO

Origen:

- Landing Page
    
- Marketplace
    
- POS (pedido telefónico)
    
- WhatsApp
    

---

# INFORMACIÓN DEL CLIENTE

Campos mínimos:

- Nombre
    
- Teléfono
    
- Dirección
    
- Referencia
    
- Ubicación GPS
    

---

# GEOLOCALIZACIÓN

Métodos:

- GPS del dispositivo
    
- Selección en mapa
    
- Dirección manual
    

---

# DATOS DEL PEDIDO

- Productos
    
- Cantidades
    
- Subtotal
    
- Costo domicilio
    
- Total
    
- Observaciones
    

---

# COSTO DOMICILIO

Valor inicial sugerido:

$4.000 COP

Configurable por comercio.

---

# CONFIGURACIÓN DE COBERTURA

Cada negocio podrá definir:

- Radio en kilómetros
    
- Barrios cubiertos
    
- Horarios de entrega
    

---

# ESTADOS DEL PEDIDO

PENDIENTE

CONFIRMADO

PREPARANDO

LISTO_PARA_ENTREGA

EN_CAMINO

ENTREGADO

CANCELADO

---

# CONFIRMACIÓN DEL COMERCIO

Al recibir pedido:

Puede:

- Confirmar
    
- Rechazar
    

Motivos de rechazo:

- Sin stock
    
- Fuera de cobertura
    
- Negocio cerrado
    
- Otro motivo
    

---

# RESERVA DE INVENTARIO

Al confirmar pedido:

Reservar stock.

---

# CANCELACIÓN

Si el pedido es cancelado:

Liberar stock reservado.

---

# DOMICILIARIOS

Roles:

DOMICILIARIO

---

# INFORMACIÓN DOMICILIARIO

- Nombre
    
- Teléfono
    
- Estado
    
- Vehículo
    
- Placa (opcional)
    

---

# ASIGNACIÓN

Manual inicialmente.

Preparar estructura para asignación automática futura.

---

# ESTADOS DOMICILIARIO

DISPONIBLE

OCUPADO

DESCONECTADO

---

# RUTA DE ENTREGA

Generar automáticamente:

Origen:  
Comercio

Destino:  
Cliente

---

# INTEGRACIÓN MAPS

Permitir abrir:

Google Maps

Waze

---

# UBICACIÓN EN TIEMPO REAL

Preparar arquitectura para:

Tracking GPS futuro.

---

# COMPROBANTE DE ENTREGA

Permitir:

- Fotografía
    
- Firma digital futura
    
- Observaciones
    

---

# NOTIFICACIONES

Cliente:

Pedido recibido.

Pedido confirmado.

Pedido en preparación.

Pedido en camino.

Pedido entregado.

---

# WHATSAPP

Generar mensajes automáticos.

Ejemplo:

Su pedido ha sido confirmado.

Total:  
$35.000

Domicilio:  
$4.000

Total a pagar:  
$39.000

---

# PANEL DEL COMERCIO

Visualizar:

Pedidos pendientes.

Pedidos en preparación.

Pedidos en ruta.

Pedidos entregados.

Pedidos cancelados.

---

# DASHBOARD

Mostrar:

Cantidad de pedidos.

Ingresos.

Domicilios realizados.

Tiempo promedio entrega.

---

# REPORTES

Pedidos por período.

Pedidos entregados.

Pedidos cancelados.

Ventas por domicilio.

Costo promedio domicilio.

---

# MÉTODOS DE PAGO

Efectivo.

Transferencia.

Tarjeta.

Pago contra entrega.

Pago anticipado (futuro).

---

# INTEGRACIONES

Inventario.

Clientes.

Marketplace.

Catálogo Digital.

POS.

Reportes.

---

# EVENTOS

PEDIDO_CREADO

PEDIDO_CONFIRMADO

PEDIDO_RECHAZADO

PEDIDO_PREPARANDO

PEDIDO_EN_CAMINO

PEDIDO_ENTREGADO

PEDIDO_CANCELADO

DOMICILIARIO_ASIGNADO

---

# REGLAS CRÍTICAS

No permitir confirmar pedidos sin stock.

No permitir domicilios fuera de cobertura.

Toda entrega debe estar asociada a un pedido.

Todo pedido confirmado debe reservar inventario.

Toda cancelación debe liberar inventario.

Toda entrega debe quedar auditada.

La ubicación del cliente debe almacenarse para optimizar futuras entregas.

---

# FUTURAS FUNCIONALIDADES

Tracking GPS en tiempo real.

Aplicación para domiciliarios.

Optimización automática de rutas.

Asignación automática de pedidos.

Pagos online.

Calificaciones de entrega.

Sistema de propinas.

Múltiples entregas por ruta.

Integración con WhatsApp Business API.