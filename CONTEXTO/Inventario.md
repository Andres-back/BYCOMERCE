# INVENTARIO.md

# OBJETIVO

Administrar todos los productos del comercio.

Este módulo es la fuente única de verdad para:

- POS
    
- Catálogo Digital
    
- Marketplace
    
- Pedidos
    
- Domicilios
    
- Reportes
    

Ningún módulo podrá crear una copia independiente de los productos.

---

# PRINCIPIO FUNDAMENTAL

Un producto existe una sola vez.

Inventario es el dueño del dato.

Todos los demás módulos consumen esta información.

---

# PRODUCTOS

Permitir:

- Crear producto
    
- Editar producto
    
- Eliminar producto
    
- Desactivar producto
    
- Duplicar producto
    

---

# INFORMACIÓN BÁSICA

Campos mínimos:

- Nombre
    
- SKU
    
- Código de barras
    
- Categoría
    
- Marca
    
- Descripción
    
- Precio costo
    
- Precio venta
    
- Estado
    

---

# IMÁGENES

Permitir:

- Imagen principal
    
- Galería de imágenes
    

Almacenamiento:

MinIO

---

# STOCK

Cada producto tendrá:

- Stock actual
    
- Stock mínimo
    
- Estado de inventario
    

Estados:

- Disponible
    
- Bajo stock
    
- Agotado
    

---

# CONTROL DE INVENTARIO

Toda modificación de stock debe generar:

Inventory Movement

Nunca modificar stock directamente.

---

# MOVIMIENTOS

Tipos:

ENTRADA

SALIDA

AJUSTE

DEVOLUCIÓN

PÉRDIDA

---

# HISTORIAL

Registrar:

- Usuario
    
- Fecha
    
- Tipo
    
- Cantidad
    
- Observación
    

---

# CATEGORÍAS

CRUD completo.

Ejemplos:

Zapatos

Ropa

Bebidas

Licores

Maquillaje

Accesorios

---

# PRODUCTOS ESPECIALIZADOS

El sistema debe soportar atributos dinámicos.

Ejemplo:

Zapatería:

- Talla
    
- Color
    

Ropa:

- Talla
    
- Género
    

Joyería:

- Material
    
- Piedra
    

Restaurante:

- Ingredientes
    
- Categoría menú
    

---

# VARIANTES

Permitir:

Producto principal

Variantes

Ejemplo:

Zapato Nike

Talla 37

Talla 38

Talla 39

Talla 40

---

# PROVEEDORES

Cada producto podrá tener:

Uno o varios proveedores.

---

# COMPRAS

Registrar:

- Factura
    
- Fecha
    
- Proveedor
    
- Productos
    
- Costos
    

---

# ACTUALIZACIÓN AUTOMÁTICA

Al registrar una compra:

Aumentar stock automáticamente.

Generar movimiento tipo ENTRADA.

---

# VENTAS

Al vender:

Disminuir stock automáticamente.

Generar movimiento tipo SALIDA.

---

# PEDIDOS WEB

Al confirmar pedido:

Reservar stock.

---

# CANCELACIÓN DE PEDIDO

Liberar stock reservado.

---

# STOCK RESERVADO

Campos:

stock_disponible

stock_reservado

stock_total

---

# ALERTAS

Generar alertas cuando:

Stock <= Stock mínimo.

---

# IMPORTACIÓN MASIVA

Permitir:

Excel

CSV

---

# EXPORTACIÓN

Permitir:

Excel

CSV

PDF

---

# BÚSQUEDA

Buscar por:

- Nombre
    
- SKU
    
- Código de barras
    
- Categoría
    
- Marca
    

---

# FILTROS

- Disponibles
    
- Agotados
    
- Bajo stock
    
- Categoría
    
- Marca
    

---

# REPORTES

Inventario valorizado.

Productos agotados.

Productos con bajo stock.

Productos más vendidos.

Rotación de inventario.

---

# AUDITORÍA

Toda acción debe registrarse.

Crear

Editar

Eliminar

Ajustar

Importar

Exportar

---

# REGLAS CRÍTICAS

Nunca permitir stock negativo.

Nunca vender productos agotados.

Toda venta debe afectar inventario.

Todo pedido debe afectar inventario.

Todo ajuste debe quedar auditado.

Inventario es la única fuente de verdad del sistema.

POS, Marketplace, Catálogo y Domicilios deben consumir este módulo.

---

# INTEGRACIONES

POS

Marketplace

Landing Pages

Pedidos

Domicilios

Reportes

Todos dependen del módulo de inventario.