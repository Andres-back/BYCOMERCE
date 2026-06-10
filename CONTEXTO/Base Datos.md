# STACK_BASE_DATOS.md

## Stack Oficial

### PostgreSQL + PostGIS

Base de datos principal.

Responsabilidades:

- Tenants
    
- Usuarios
    
- Roles
    
- Productos
    
- Categorías
    
- Inventario
    
- Compras
    
- Ventas
    
- Clientes
    
- Proveedores
    
- Pedidos
    
- Domicilios
    
- Gastos
    
- Suscripciones
    
- Configuración
    
- Reportes
    
- Geolocalización
    

---

### Redis

Responsabilidades:

- Cache
    
- Sesiones
    
- WebSockets
    
- Eventos
    
- Colas
    
- Rate Limiting
    

---

### MinIO (S3 Compatible)

Responsabilidades:

- Logos
    
- Imágenes de productos
    
- Comprobantes
    
- Facturas PDF
    
- Imágenes de gastos
    
- Archivos adjuntos
    

---

### Prisma ORM

Responsabilidades:

- Acceso a datos
    
- Migraciones
    
- Tipado TypeScript
    
- Gestión del esquema
    

---

## Arquitectura

Frontend (Next.js)  
↓  
Backend (NestJS)  
↓  
Prisma  
↓  
PostgreSQL + PostGIS

Backend (NestJS)  
↓  
Redis

Backend (NestJS)  
↓  
MinIO

---

## Docker

Contenedores iniciales:

- nginx
    
- frontend-nextjs
    
- backend-nestjs
    
- postgres
    
- redis
    
- minio
    
- pgadmin
    

---

## Decisión Oficial

La plataforma utilizará:

- PostgreSQL
    
- PostGIS
    
- Redis
    
- MinIO
    
- Prisma
    
- Docker
    

como stack base de datos y almacenamiento para todas las fases del proyecto.