# MARKETPLACE.md

# OBJETIVO

Crear un marketplace centralizado donde los usuarios puedan descubrir, explorar y contactar comercios de Mocoa y futuras ciudades.

El marketplace será el punto de entrada principal para los clientes.

---

# VISIÓN

Convertirse en el directorio comercial digital más completo de la región.

Permitir que cualquier usuario encuentre:

- Productos.
    
- Comercios.
    
- Servicios.
    
- Promociones.
    
- Domicilios.
    

Desde una sola plataforma.

---

# URL PRINCIPAL

mocoastore.alexsters.works

---

# URL DE COMERCIOS

mocoastore.alexsters.works/negocio/{slug}

---

# HOME DEL MARKETPLACE

Mostrar:

- Comercios destacados.
    
- Categorías.
    
- Promociones.
    
- Negocios nuevos.
    
- Negocios cercanos.
    
- Productos destacados.
    

---

# CATEGORÍAS

Iniciales:

- Tiendas de barrio
    
- Restaurantes
    
- Comida rápida
    
- Zapaterías
    
- Ropa
    
- Licoreras
    
- Maquillaje
    
- Joyerías
    

---

# DIRECTORIO DE COMERCIOS

Mostrar:

- Logo
    
- Nombre
    
- Categoría
    
- Dirección
    
- Distancia
    
- Estado abierto/cerrado
    
- Botón visitar
    

---

# PERFIL DEL COMERCIO

Al ingresar:

Redirigir a la landing page del negocio.

Mostrar:

- Información general.
    
- Productos.
    
- Promociones.
    
- Ubicación.
    
- WhatsApp.
    

---

# BÚSQUEDA GLOBAL

Buscar por:

- Nombre comercio.
    
- Producto.
    
- Categoría.
    
- Marca.
    

---

# FILTROS

Categoría.

Barrio.

Distancia.

Disponibilidad domicilio.

Promociones.

Abierto ahora.

---

# GEOLOCALIZACIÓN

Solicitar ubicación del usuario.

Permitir:

- Comercios cercanos.
    
- Productos cercanos.
    
- Negocios por distancia.
    

---

# DISTANCIA

Mostrar:

- 500 metros.
    
- 1 km.
    
- 3 km.
    
- 5 km.
    
- 10 km.
    

Calculado usando PostGIS.

---

# NEGOCIOS CERCANOS

Ordenar automáticamente por:

Distancia.

---

# PRODUCTOS DESTACADOS

Mostrar productos publicados por los comercios.

Información:

- Imagen.
    
- Precio.
    
- Comercio.
    
- Categoría.
    

---

# PROMOCIONES

Mostrar:

- Ofertas activas.
    
- Descuentos.
    
- Combos.
    

---

# COMERCIOS DESTACADOS

Espacios patrocinados.

Ubicación preferencial.

Beneficio premium.

---

# NEGOCIOS NUEVOS

Mostrar comercios recientemente registrados.

---

# POPULARES

Mostrar:

- Más visitados.
    
- Más vendidos.
    
- Mejor calificados.
    

---

# CALIFICACIONES

Preparar estructura para:

- Estrellas.
    
- Comentarios.
    
- Opiniones.
    

Implementación futura.

---

# FAVORITOS

Permitir:

Guardar comercios.

Guardar productos.

Implementación futura.

---

# MAPA GENERAL

Mostrar:

Todos los comercios registrados.

Filtrables por categoría.

---

# MAPA DEL COMERCIO

Mostrar:

Ubicación exacta.

Botón:

Cómo llegar.

---

# MAPS

Integraciones:

Google Maps.

Waze.

---

# DOMICILIOS

Mostrar:

Disponible.

No disponible.

Costo estimado.

Tiempo estimado.

---

# SEO

Generar automáticamente:

- URLs amigables.
    
- Meta títulos.
    
- Meta descripción.
    
- Open Graph.
    
- Sitemap.
    

---

# ANALÍTICAS DEL MARKETPLACE

Registrar:

- Visitas.
    
- Búsquedas.
    
- Clics.
    
- Comercios visitados.
    
- Productos vistos.
    

---

# PANEL DEL COMERCIO

Cada negocio podrá visualizar:

- Visitas recibidas.
    
- Productos más vistos.
    
- Comercios comparables.
    
- Conversiones.
    

---

# PUBLICIDAD INTERNA

Permitir:

Destacar negocios.

Destacar productos.

Promocionar categorías.

---

# FUTURA MONETIZACIÓN

Planes premium.

Publicidad.

Promociones patrocinadas.

Comisiones por pedidos.

Comisiones por pagos online.

---

# INTEGRACIONES

Catálogo Digital.

Inventario.

Pedidos.

Domicilios.

Reportes.

Clientes.

---

# EVENTOS

COMERCIO_VISITADO

PRODUCTO_VISUALIZADO

BUSQUEDA_REALIZADA

PROMOCION_VISUALIZADA

UBICACION_COMPARTIDA

RUTA_SOLICITADA

---

# REGLAS CRÍTICAS

Solo mostrar productos activos.

Solo mostrar comercios activos.

Toda información debe provenir del sistema central.

No duplicar productos.

No duplicar comercios.

Toda distancia debe calcularse mediante geolocalización real.

Marketplace es la puerta de entrada principal para los clientes de la plataforma.

---

# ACTUALIZACION 2026-06-14

- `/marketplace` adopta una presentacion tipo directorio premium:
  - categorias con conteos.
  - cards de comercio con banner/logo, estado, tipo de negocio, ciudad/barrio, productos, sede y domicilio.
  - CTA directo a la pagina del negocio.
- `/negocio/[slug]` mantiene fuente de verdad en inventario y mejora el catalogo:
  - filtros con conteos por categoria.
  - cards de producto con imagen, disponibilidad, categoria, precio y accion de agregar.
  - paleta sigue saliendo del branding del tenant o fallback por tipo de negocio.
- No se copio contenido ni marca externa; se adapto el patron visual solicitado como referencia.

# ACTUALIZACION 2026-06-14 - DIRECTORIO DESKTOP Y DATOS DEMO

- Referencia revisada: `https://daimuz.alexsters.works/`.
- Patron aplicado:
  - header compacto con busqueda.
  - hero horizontal para pantallas de computador.
  - producto destacado al lado del hero.
  - tarjetas "Para ti".
  - tabs Comercios/Ofertas/Novedades.
  - chips de categorias con conteos.
  - panel lateral de estadisticas y promociones.
- `/marketplace` ahora muestra comercios como primera experiencia, no solo productos.
- Seed demo:
  - 12 comercios locales de muestra, con productos, categorias, banners, logos, delivery y branding.
  - Los nombres/tipos se tomaron como datos publicos visibles del directorio de referencia y los productos/imagenes son demo propios de Mocoa Market.
- Regla tecnica:
  - el frontend de produccion debe arrancar con standalone, no con `next start`, para evitar errores 500/404 en chunks CSS/JS.
