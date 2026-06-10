# CRM_CLIENTES.md

# OBJETIVO

Centralizar la información de los clientes de cada comercio para mejorar ventas, fidelización y servicio.

El CRM debe permitir conocer:

- Quién compra.
    
- Qué compra.
    
- Cuándo compra.
    
- Cuánto compra.
    
- Con qué frecuencia compra.
    

---

# PRINCIPIO FUNDAMENTAL

Cada cliente pertenece al comercio que lo registró.

Toda la información debe estar asociada al tenant.

---

# CREACIÓN DE CLIENTES

Permitir:

- Registro manual.
    
- Registro desde POS.
    
- Registro desde Marketplace.
    
- Registro desde Catálogo Digital.
    
- Registro desde Domicilios.
    

---

# DATOS BÁSICOS

Campos mínimos:

- Nombre
    
- Teléfono
    
- Email
    
- Dirección
    
- Barrio
    
- Ciudad
    
- Ubicación GPS
    
- Observaciones
    

---

# DATOS COMERCIALES

Mostrar:

- Total gastado
    
- Cantidad de compras
    
- Última compra
    
- Ticket promedio
    
- Frecuencia de compra
    

---

# PERFIL DEL CLIENTE

Visualizar:

Información general.

Historial de compras.

Pedidos.

Domicilios.

Gastos acumulados.

Puntos acumulados.

---

# HISTORIAL DE COMPRAS

Mostrar:

- Fecha
    
- Productos
    
- Total
    
- Método de pago
    
- Estado
    

---

# HISTORIAL DE PEDIDOS

Mostrar:

- Fecha
    
- Productos
    
- Estado
    
- Domicilio
    
- Total
    

---

# BÚSQUEDA

Buscar por:

- Nombre
    
- Teléfono
    
- Email
    

---

# FILTROS

Clientes nuevos.

Clientes frecuentes.

Clientes inactivos.

Clientes VIP.

---

# SEGMENTACIÓN

Clasificación automática.

---

## NUEVO

Primeras compras.

---

## FRECUENTE

Compra regularmente.

---

## VIP

Alto volumen de compras.

---

## INACTIVO

Sin compras recientes.

---

# ETIQUETAS

Permitir etiquetas personalizadas.

Ejemplos:

Mayorista.

VIP.

Frecuente.

Domicilios.

Corporativo.

---

# NOTAS

Registrar observaciones internas.

Ejemplo:

Prefiere entregas después de las 6 PM.

---

# DIRECCIONES

Un cliente podrá tener múltiples direcciones.

Ejemplo:

Casa.

Trabajo.

Negocio.

---

# GEOLOCALIZACIÓN

Guardar:

Latitud.

Longitud.

Permitir:

Rutas rápidas.

Domicilios.

Cobertura.

---

# FIDELIZACIÓN

Preparar integración con:

Puntos.

Cupones.

Beneficios.

Descuentos.

---

# PUNTOS

Arquitectura preparada para:

Acumular puntos por compra.

Canjear puntos.

---

# CUPONES

Arquitectura preparada para:

Descuentos.

Promociones.

Campañas.

---

# RECORDATORIOS

Preparar sistema para:

Cumpleaños.

Aniversarios.

Promociones.

---

# COMUNICACIONES

Preparar integración:

WhatsApp.

Correo.

SMS.

---

# ANALÍTICAS

Mostrar:

Clientes activos.

Clientes nuevos.

Clientes recurrentes.

Clientes perdidos.

---

# REPORTES

Top clientes.

Clientes por gasto.

Clientes por frecuencia.

Clientes inactivos.

---

# DASHBOARD CRM

Indicadores:

Clientes activos.

Clientes nuevos.

Clientes VIP.

Clientes inactivos.

---

# INTEGRACIONES

POS.

Inventario.

Marketplace.

Catálogo Digital.

Pedidos.

Domicilios.

Reportes.

---

# EVENTOS

CLIENTE_CREADO

CLIENTE_ACTUALIZADO

COMPRA_REALIZADA

PEDIDO_REALIZADO

CLIENTE_CLASIFICADO

---

# REGLAS CRÍTICAS

No duplicar clientes por teléfono.

Toda compra debe asociarse al cliente cuando sea posible.

Toda venta debe actualizar estadísticas.

Todo pedido debe actualizar historial.

Todo cliente debe pertenecer a un único tenant.

La información del cliente es propiedad del comercio.

---

# FUTURAS FUNCIONALIDADES

Puntos automáticos.

Campañas WhatsApp.

Automatizaciones.

Segmentación avanzada.

Inteligencia artificial.

Predicción de recompra.

Recomendaciones de productos.

Valor de vida del cliente (LTV).

Recuperación automática de clientes inactivos.
