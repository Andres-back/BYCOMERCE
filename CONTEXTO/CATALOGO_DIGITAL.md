# CATALOGO_DIGITAL.md

# OBJETIVO

Convertir el inventario del comercio en una experiencia de compra digital accesible desde cualquier dispositivo.

Cada comercio tendrá una landing page pública conectada directamente al inventario.

No existirán productos duplicados.

Todo producto mostrado proviene del módulo de inventario.

---

# PRINCIPIO FUNDAMENTAL

El catálogo digital es una vista del inventario.

No administra productos.

No almacena stock.

No almacena precios.

Consume información directamente desde Inventario.

---

# URL DEL NEGOCIO

Formato:

mocoastore.alexsters.works/negocio/{slug}

Ejemplo:

mocoastore.alexsters.works/negocio/zapateria-andres

---

# INFORMACIÓN DEL NEGOCIO

Mostrar:

- Logo
    
- Banner
    
- Nombre
    
- Descripción
    
- Horarios
    
- Dirección
    
- Teléfono
    
- WhatsApp
    
- Redes sociales
    
- Ubicación
    

---

# PLANTILLAS

Cada tipo de negocio tendrá una plantilla especializada.

---

## Zapatería

Priorizar:

- Fotografías
    
- Tallas
    
- Colores
    
- Marcas
    

---

## Ropa

Priorizar:

- Colecciones
    
- Tallas
    
- Género
    
- Temporadas
    

---

## Tienda de Barrio

Priorizar:

- Productos populares
    
- Promociones
    
- Búsqueda rápida
    

---

## Restaurante

Priorizar:

- Menú
    
- Combos
    
- Categorías
    
- Productos destacados
    

---

## Licorera

Priorizar:

- Marcas
    
- Promociones
    
- Combos
    

---

## Maquillaje

Priorizar:

- Tonos
    
- Marcas
    
- Categorías
    

---

## Joyería

Priorizar:

- Fotografías
    
- Materiales
    
- Colecciones
    

---

# CATÁLOGO

Mostrar:

- Imagen
    
- Nombre
    
- Precio
    
- Disponibilidad
    
- Descripción
    

---

# DISPONIBILIDAD

Mostrar:

Disponible

Pocas unidades

Agotado

Basado en inventario real.

---

# BÚSQUEDA

Permitir búsqueda por:

- Nombre
    
- Categoría
    
- Marca
    

---

# FILTROS

Categorías

Marcas

Precio

Disponibilidad

---

# PRODUCTO DETALLE

Mostrar:

- Galería de imágenes
    
- Descripción
    
- Precio
    
- Variantes
    
- Disponibilidad
    
- Productos relacionados
    

---

# VARIANTES

Soportar:

- Tallas
    
- Colores
    
- Presentaciones
    
- Volúmenes
    

Dependiendo del tipo de negocio.

---

# CARRITO

Permitir:

- Agregar producto
    
- Modificar cantidad
    
- Eliminar producto
    
- Vaciar carrito
    

---

# VALIDACIÓN DE STOCK

Antes de agregar:

Verificar stock disponible.

---

# PEDIDO

Al finalizar compra:

Crear pedido.

Reservar stock.

Generar resumen.

---

# WHATSAPP

Generar mensaje automático.

Ejemplo:

Hola.

Deseo realizar el siguiente pedido:

Producto A x2

Producto B x1

Total estimado:  
$45.000

Nombre:  
Juan Pérez

Teléfono:  
3000000000

Dirección:  
Barrio Centro

Ubicación:  
[https://maps.google.com/](https://maps.google.com/)...

Gracias.

---

# GEOLOCALIZACIÓN CLIENTE

Permitir:

- Compartir GPS.
    
- Elegir punto en mapa.
    
- Escribir dirección manual.
    

---

# DOMICILIO

Mostrar:

Costo domicilio.

Tiempo estimado.

Cobertura.

---

# MAPA DEL NEGOCIO

Mostrar:

Ubicación exacta.

Botón:

Cómo llegar.

---

# INTEGRACIÓN MAPS

Funciones:

Abrir Google Maps.

Abrir Waze.

Compartir ubicación.

---

# PRODUCTOS DESTACADOS

Permitir:

Destacar productos.

Promociones.

Novedades.

Más vendidos.

---

# PROMOCIONES

Soportar:

- Descuentos.
    
- Combos.
    
- Ofertas temporales.
    

---

# SEO

Generar automáticamente:

- Título.
    
- Descripción.
    
- Open Graph.
    
- Sitemap.
    

---

# ANALÍTICAS

Registrar:

- Visitas.
    
- Productos vistos.
    
- Productos agregados.
    
- Pedidos iniciados.
    
- Pedidos enviados.
    

---

# RESPONSIVE

Optimizado para:

- Celular
    
- Tablet
    
- Desktop
    

Prioridad máxima:

Celular.

---

# CONFIGURACIÓN

Cada comercio podrá modificar:

- Colores
    
- Banner
    
- Logo
    
- Redes sociales
    
- WhatsApp
    

Sin tocar código.

---

# INTEGRACIONES

Inventario

Pedidos

Marketplace

Domicilios

Reportes

Clientes

---

# EVENTOS

PRODUCTO_VISUALIZADO

PRODUCTO_AGREGADO_CARRITO

PEDIDO_INICIADO

PEDIDO_ENVIADO

UBICACION_COMPARTIDA

---

# REGLAS CRÍTICAS

Nunca mostrar stock incorrecto.

Nunca vender productos agotados.

Toda compra debe validar inventario.

Todo pedido debe registrarse.

Todo producto mostrado debe existir en inventario.

El catálogo es únicamente una representación visual del inventario.