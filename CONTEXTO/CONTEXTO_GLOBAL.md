# CONTEXTO_GLOBAL.md

# OBJETIVO

Documento maestro del proyecto Mocoa Market.

Funciona como punto de entrada único para cualquier desarrollador, IA o nuevo integrante del equipo.

Contiene:

- Visión general del sistema.
- Arquitectura de alto nivel.
- Stack tecnológico.
- Mapa de módulos.
- Mapa de entidades.
- Mapa de eventos.
- Flujo de datos.
- Dependencias entre módulos.
- Infraestructura.
- Convenciones globales.
- Índice de toda la documentación.

Este documento es la fuente de verdad a nivel ejecutivo.

Para detalle técnico, consultar los documentos específicos listados en cada sección.

---

# VISIÓN GENERAL

Mocoa Market es una plataforma SaaS multi-tenant que digitaliza pequeños y medianos comercios mediante una solución integral que combina:

- Inventario.
- Punto de Venta (POS).
- Catálogo Digital.
- Landing Page pública.
- Marketplace local.
- Domicilios.
- Geolocalización.
- Reportes administrativos.
- CRM.

Mercado objetivo: Mocoa (Fase 1) → Putumayo → Amazonía Colombiana → Colombia.

Detalle completo: [[NEGOCIO.MD]]

---

# ARQUITECTURA DE ALTO NIVEL

```
┌──────────────────────────────────────────────────────────────┐
│  Cliente Web (Next.js)        Cliente Móvil (futuro)         │
└──────────────────┬───────────────────────────────────────────┘
                   │ HTTPS
                   ▼
┌──────────────────────────────────────────────────────────────┐
│  Nginx (Reverse Proxy + SSL + Caché)                          │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│  Frontend Next.js (App Router)                                │
│  - (public)  - admin  - auth  - dashboard  - marketplace      │
│  - negocio/[slug]  - api                                     │
└──────────────────┬───────────────────────────────────────────┘
                   │ REST + WebSockets
                   ▼
┌──────────────────────────────────────────────────────────────┐
│  Backend NestJS (API + Workers + WebSockets)                  │
│  - Módulos: auth, users, tenants, plans, inventory,          │
│    suppliers, purchases, pos, customers, orders,             │
│    delivery, marketplace, reports, settings, audit           │
└──────┬──────────┬──────────┬──────────┬─────────────────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│Postgres │ │  Redis  │ │  MinIO  │ │ BullMQ  │
│ +PostGIS│ │(cache,  │ │(storage)│ │(queues) │
│         │ │ sessions│ │         │ │         │
│         │ │ WS, evt)│ │         │ │         │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

Detalle completo: [[ARQUITECTURA.md]]

---

# STACK TECNOLÓGICO OFICIAL

| Capa | Tecnología | Documento |
|------|-----------|-----------|
| Frontend | Next.js (App Router) | [[ESTRUCTURA.md]] |
| Backend | NestJS | [[ESTRUCTURA.md]] |
| ORM | Prisma | [[Base Datos.md]] |
| Base de datos | PostgreSQL + PostGIS | [[Base Datos.md]] |
| Cache / Sesiones / WS | Redis | [[Base Datos.md]], [[CACHE.md]] |
| Storage | MinIO (S3 compatible) | [[Base Datos.md]] |
| Colas | BullMQ (sobre Redis) | [[EVENTOS.md]] |
| Reverse Proxy | Nginx | [[INFRAESTRUCTURA.md]] |
| Contenedores | Docker + Docker Compose | [[INFRAESTRUCTURA.md]] |
| OS Servidor | Ubuntu Server LTS | [[INFRAESTRUCTURA.md]] |
| Proveedor VPS | Contabo | [[INFRAESTRUCTURA.md]] |
| Lenguaje | TypeScript estricto | [[REGLAS_IA.md]] |

Regla: No sustituir ninguna tecnología de esta tabla sin aprobación explícita y ADR documentado.

---

# MAPA DE MÓDULOS DEL SISTEMA

## Módulos de negocio

| Módulo | Backend | Frontend | Estado | Documento |
|--------|---------|----------|--------|-----------|
| Dashboard | modules/reports | admin/dashboard | ✅ Implementado | [[REPORTES.md]] |
| Inventario | modules/inventory | admin/inventory | ✅ Implementado | [[Inventario.md]] |
| POS | modules/pos | admin/pos | ✅ Implementado | [[POS.md]] |
| Catálogo Digital | modules/orders + marketplace | negocio/[slug] | ✅ Implementado | [[CATALOGO_DIGITAL.md]] |
| Marketplace | modules/marketplace | app/marketplace | ✅ Implementado | [[MARKETPLACE.md]] |
| CRM | modules/customers | admin/customers | ✅ Implementado | [[CRM_CLIENTE.md]] |
| Pedidos/Domicilios | modules/orders | admin/orders | ✅ Implementado | [[DOMICILIOS.md]] |
| Reportes | modules/reports | admin/reports | ✅ Implementado | [[REPORTES.md]] |
| Promociones | modules/promotions | admin/promotions | ✅ Implementado | [[PROMOCIONES.md]] |
| Fidelización | modules/loyalty | admin/loyalty | ✅ Implementado | [[FIDELIZACION.md]] |
| Sucursales | modules/branches | admin/branches | ✅ Implementado | [[SUCURSALES.md]] |
| Ruta de entrega | modules/orders | admin/delivery/route | ✅ Implementado | [[DOMICILIOS.md]] |
| Caja/Gastos | modules/finance | admin/cash | ✅ Implementado | [[POS.md]] |
| Compras/Proveedores | modules/inventory | admin/purchases | ✅ Implementado | [[Inventario.md]] |
| Configuración | modules/tenants | admin/settings | ✅ Implementado | — |
| Usuarios | modules/users | admin/users | ✅ Implementado | [[AUTH.md]] |
| Planes/Suscripción | modules/plans | admin/plans | ✅ Implementado | [[SUSCRIPCIONES.md]] |
| Notificaciones | modules/notifications | admin/notifications | ✅ Implementado | [[NOTIFICACIONES.md]] |
| Domiciliarios | — | admin/delivery | ✅ Implementado | [[DOMICILIOS.md]] |
| Super Admin | modules/superadmin | admin/superadmin/* | ✅ Implementado | — |

## Módulos transversales

| Módulo | Estado | Documento |
|--------|--------|-----------|
| Autenticación (JWT) | ✅ Implementado | [[AUTH.md]] |
| Autorización (RBAC) | ✅ Implementado (4 roles) | [[RBAC.md]] |
| Multi-tenant | ✅ Implementado | [[MULTI_TENANT.md]] |
| Auditoría | ✅ Implementado | [[AUDITORIA.md]] |
| API REST | ✅ Implementado (150+ endpoints) | [[API.md]] |
| Eventos | ✅ Implementado | [[EVENTOS.md]] |
| WebSockets | ✅ Implementado | [[WEBSOCKETS.md]] |
| Cache | ✅ Implementado (Redis) | [[CACHE.md]] |
| Pagos | ✅ Implementado | [[PAGOS.md]] |
| WhatsApp | ✅ Implementado (wa.me) | [[WHATSAPP.md]] |
| Geolocalización | ✅ Implementado (Leaflet) | [[GEOLOCALIZACION.md]] |

## Frontend

| Componente | Stack | Estado |
|------------|-------|--------|
| UI | shadcn/ui + Tailwind v4 + 28 SVG iconos premium | ✅ |
| Animaciones | GSAP + ScrollTrigger | ✅ |
| Formularios | React Hook Form + Zod v4 | ✅ |
| Tablas | @tanstack/react-table | ✅ |
| Gráficas | Recharts | ✅ |
| Mapas | Leaflet + react-leaflet | ✅ |
| Estado | TanStack Query + Zustand | ✅ |
| Transiciones | GSAP timeline | ✅ |
| Responsive | Mobile-first, sidebar Sheet, overflow-x-auto | ✅ |

---

# MAPA DE ENTIDADES PRINCIPALES

Fuente de verdad: [[Modelo Datos.md]] y [[Base Datos.md]].

## Núcleo

- TENANTS — comercio registrado.
- USERS — usuarios del sistema.
- ROLES — catálogo de roles.
- PLANS — planes de suscripción.
- SUBSCRIPTIONS — suscripciones activas.

## Catálogo

- CATEGORIES — categorías de productos.
- PRODUCTS — productos (fuente única de verdad).
- PRODUCT_VARIANTS — variantes (talla, color, etc).
- PRODUCT_IMAGES — galería de imágenes.
- PRODUCT_SUPPLIER — relación producto-proveedor.
- SUPPLIERS — proveedores.

## Inventario

- INVENTORY_MOVEMENTS — auditoría de stock.
- STOCK_RESERVATIONS — stock reservado por pedidos.

## Ventas y caja

- SALES — ventas POS.
- SALE_ITEMS — detalle de venta.
- CASH_REGISTERS — aperturas/cierres de caja.
- CASH_MOVEMENTS — movimientos individuales de caja.
- EXPENSES — gastos del comercio.

## Compras

- PURCHASES — compras a proveedores.
- PURCHASE_ITEMS — detalle de compras.

## Clientes y pedidos

- CUSTOMERS — clientes del comercio.
- ORDERS — pedidos web y domicilios.
- ORDER_ITEMS — detalle de pedidos.

## Configuración

- DELIVERY_CONFIG — config de domicilios por tenant.
- BUSINESS_SETTINGS — branding y redes.

## Sistema

- AUDIT_LOGS — auditoría del sistema.

---

# MAPA DE EVENTOS

Fuente de verdad: [[EVENTOS.md]].

## Inventario

- PRODUCTO_CREADO
- PRODUCTO_EDITADO
- PRODUCTO_ELIMINADO
- STOCK_AJUSTADO
- STOCK_BAJO
- COMPRA_REGISTRADA

## POS

- VENTA_REALIZADA
- VENTA_ANULADA
- DEVOLUCION_REALIZADA
- CAJA_ABIERTA
- CAJA_CERRADA
- GASTO_REGISTRADO

## Pedidos

- PEDIDO_CREADO
- PEDIDO_CONFIRMADO
- PEDIDO_RECHAZADO
- PEDIDO_PREPARANDO
- PEDIDO_LISTO
- PEDIDO_EN_CAMINO
- PEDIDO_ENTREGADO
- PEDIDO_CANCELADO
- DOMICILIARIO_ASIGNADO

## Catálogo y Marketplace

- PRODUCTO_VISUALIZADO
- PRODUCTO_AGREGADO_CARRITO
- PEDIDO_INICIADO
- PEDIDO_ENVIADO
- COMERCIO_VISITADO
- BUSQUEDA_REALIZADA
- UBICACION_COMPARTIDA
- RUTA_SOLICITADA

## CRM

- CLIENTE_CREADO
- CLIENTE_ACTUALIZADO
- CLIENTE_CLASIFICADO
- COMPRA_REALIZADA
- PEDIDO_REALIZADO

## Suscripciones

- SUSCRIPCION_CREADA
- SUSCRIPCION_RENOVADA
- SUSCRIPCION_CANCELADA
- PAGO_RECIBIDO
- PAGO_FALLIDO

## Sistema

- USUARIO_INVITADO
- USUARIO_ACTIVO
- TENANT_ACTIVO
- TENANT_SUSPENDIDO
- ALERTA_STOCK
- REPORTE_GENERADO
- EXPORTACION_REALIZADA

---

# FLUJO DE DATOS

## Flujo de venta POS

```
[Cajero] → [Frontend POS]
            ↓
            [API REST /sales]
            ↓
            [NestJS SalesService]
              ├── Validar stock disponible
              ├── Generar SALE + SALE_ITEMS
              ├── Generar INVENTORY_MOVEMENTS (SALIDA)
              ├── Generar CASH_MOVEMENT
              ├── Generar AUDIT_LOG
              └── Emitir evento VENTA_REALIZADA
                              ↓
              [BullMQ] → [Listeners: reportes, CRM, analytics]
```

## Flujo de pedido web

```
[Cliente] → [Catálogo/Marketplace]
            ↓ (carrito + checkout)
            [API REST /orders]
            ↓
            [NestJS OrdersService]
              ├── Validar stock disponible
              ├── Crear STOCK_RESERVATIONS
              ├── Crear ORDER + ORDER_ITEMS
              ├── Crear notificación al comercio
              └── Emitir evento PEDIDO_CREADO
                              ↓
            [Comercio] confirma → PEDIDO_CONFIRMADO
                              ↓
            [Domiciliario] asignado → DOMICILIARIO_ASIGNADO
                              ↓
            [Entrega] → PEDIDO_ENTREGADO
              ├── Consumir STOCK_RESERVATIONS
              ├── Generar INVENTORY_MOVEMENTS (SALIDA)
              ├── Generar CASH_MOVEMENT (pago contra entrega)
              └── Emitir evento PEDIDO_ENTREGADO
```

## Flujo de cancelación de pedido

```
[Cancela comercio o cliente]
            ↓
            [NestJS OrdersService.cancel]
              ├── Liberar STOCK_RESERVATIONS
              ├── Marcar ORDER como CANCELADO
              ├── Generar AUDIT_LOG
              └── Emitir evento PEDIDO_CANCELADO
                              ↓
              [Listeners] → Notificar cliente vía WhatsApp
```

## Flujo de actualización de inventario

```
[Fuente: compra, venta, pedido, ajuste, devolución, pérdida]
            ↓
            [InventoryService]
              ├── Bloqueo optimista (Prisma transaction)
              ├── Insertar INVENTORY_MOVEMENTS
              ├── Actualizar PRODUCTS.stock
              ├── Si variant → actualizar PRODUCT_VARIANTS.stock
              ├── Generar AUDIT_LOG
              ├── Si stock < stock_minimo → ALERTA_STOCK
              └── Emitir evento STOCK_AJUSTADO
```

---

# DEPENDENCIAS ENTRE MÓDULOS

```
                    ┌──────────────┐
                    │  AUTH / RBAC │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   INVENTARIO          CLIENTES           USUARIOS
        │                  │                  │
        ├──────────┬───────┼──────────┬───────┤
        ▼          ▼       ▼          ▼       ▼
     COMPRAS    POS    PEDIDOS    REPORTES  AUDITORIA
        │          │       │
        │          │       ├── MARKETPLACE
        │          │       ├── CATÁLOGO DIGITAL
        │          │       └── DOMICILIOS
        │          │
        └──────────┴────► NOTIFICACIONES (WhatsApp, email, push)
                       │
                       └────► EVENTOS (bus global)
```

**Reglas de dependencia:**

- Inventario NO depende de ningún módulo de negocio (fuente única).
- POS depende de Inventario y Caja.
- Pedidos depende de Inventario, Clientes y Catálogo.
- Reportes depende de TODOS los módulos de negocio (es solo lectura).
- CRM depende de Clientes, POS y Pedidos.
- Notificaciones depende de Eventos.
- Auditoría es transversal (intercepta todos los módulos críticos).

---

# INFRAESTRUCTURA

Detalle completo: [[INFRAESTRUCTURA.md]] y [[eviroments.md]].

## Fase actual: MVP

- 1 VPS Contabo
- Ubuntu Server LTS
- Docker + Docker Compose
- Nginx como reverse proxy
- Stack: Postgres+PostGIS, Redis, MinIO, NestJS, Next.js

## Dominio

- Producción: `mocoastore.alexsters.works`
- Hosts Docker internos: `postgres`, `redis`, `minio`, `backend`, `frontend`, `nginx`

## Red Docker

Todos los servicios se comunican por la red interna de Docker. Nunca usar IPs fijas. Siempre usar nombres de servicio.

---

# CONVENCIONES GLOBALES

Detalle completo: [[ESTRUCTURA.md]] y [[REGLAS_IA.md]].

## Nomenclatura de archivos

- MAYÚSCULAS_CON_GUION para documentos oficiales.
- kebab-case para código (carpetas, archivos, clases CSS).
- PascalCase para clases e interfaces.
- SCREAMING_SNAKE_CASE para enums y constantes.

## Código

- TypeScript estricto.
- Prisma como capa de acceso a datos.
- Una sola fuente de verdad para productos (módulo Inventario).
- Todo módulo multi-tenant incluye `tenant_id`.
- Toda operación crítica audita.
- Todo cambio importante documenta.

## Git

- Mensajes claros y descriptivos.
- No commit de secretos, .env, credenciales.
- Branch naming: `feature/`, `fix/`, `hotfix/`, `docs/`.

## Documentación

- Esta carpeta es la fuente de verdad.
- Todo cambio arquitectónico actualiza docs.
- Backlinks entre documentos relacionados (formato Obsidian `[[DOC]]`).
- Nivel de confianza marcado explícitamente en decisiones nuevas.

---

# PRINCIPIOS RECTORES

1. **Una sola fuente de verdad.** Productos, clientes e inventario no se duplican.
2. **Multi-tenant obligatorio.** Todo dato comercial lleva `tenant_id`.
3. **Modularidad.** Cada módulo aislado y desacoplado vía eventos.
4. **Auditoría por defecto.** Toda operación crítica queda registrada.
5. **Bajo costo operativo.** Optimizar para VPS pequeño hasta que las métricas indiquen escalar.
6. **Mobile-first.** La prioridad de UX es celular.
7. **Stack estable.** No cambiar tecnologías oficiales sin ADR.
8. **Documentación viva.** Esta carpeta crece con el sistema.

---

# ÍNDICE MAESTRO DE DOCUMENTACIÓN

## Documentos fundacionales

- [[PROMPT_INICIO.md]] — **Prompt canónico para dar a cualquier IA al iniciar sesión.**
- [[NEGOCIO.MD]] — Plan de negocio.
- [[ESTRUCTURA.md]] — Estructura de carpetas.
- [[ARQUITECTURA.md]] — Arquitectura técnica.
- [[FRONTEND_STACK.md]] — Stack frontend oficial (librerías, versiones, patrones, riesgos).
- [[CONTEXTO_GLOBAL.md]] — Este documento.
- [[Modelo Datos.md]] — Modelo de datos.
- [[Base Datos.md]] — Stack de persistencia.
- [[INFRAESTRUCTURA.md]] — Infraestructura.
- [[eviroments.md]] — Variables de entorno.
- [[REGLAS_IA.md]] — Reglas para IAs y LLMs.
- [[ESTRATEGIA_COMERCIAL.md]] — Estrategia comercial.

## Documentos de módulos de negocio

- [[Inventario.md]]
- [[POS.md]]
- [[CATALOGO_DIGITAL.md]]
- [[MARKETPLACE.md]]
- [[CRM_CLIENTE.md]]
- [[DOMICILIOS.md]]
- [[REPORTES.md]]

## Documentos transversales (seguridad y acceso)

- [[AUTH.md]]
- [[RBAC.md]]
- [[MULTI_TENANT.md]]
- [[AUDITORIA.md]]

## Documentos transversales (contratos)

- [[API.md]]
- [[EVENTOS.md]]
- [[WEBSOCKETS.md]]
- [[CACHE.md]]

## Documentos de negocio (extensiones)

- [[PAGOS.md]]
- [[SUSCRIPCIONES.md]]
- [[PROMOCIONES.md]]
- [[NOTIFICACIONES.md]]
- [[WHATSAPP.md]]
- [[FIDELIZACION.md]]
- [[SUCURSALES.md]]

## Documentos operativos

- [[DEPLOYMENT.md]]
- [[CI_CD.md]]
- [[BACKUPS.md]]
- [[SEGURIDAD.md]]
- [[MONITOREO.md]]
- [[LOGGING.md]]
- [[TESTING.md]]
- [[INTEGRACIONES.md]]
- [[GEOLOCALIZACION.md]]
- [[SOPORTE.md]]

## Documentos de cierre

- [[ANALISIS_GAPS.md]] — Vacíos detectados.
- [[INDEX.md]] — Índice de búsqueda rápida.
- [[PROMPT_INICIO.md]] — Prompt canónico de inicio de sesión para IAs.

---

# ESTADO DEL PROYECTO

- Fase actual: MVP / Fase 1 (Mocoa).
- Cobertura documental: en construcción. Ver [[ANALISIS_GAPS.md]].
- Stack: definido y estable.
- Decisiones pendientes: ver preguntas en cada fase del plan.

---

# REGLAS CRÍTICAS

- Este documento y [[REGLAS_IA.md]] son obligatorios antes de cualquier modificación de código.
- Cualquier inconsistencia detectada entre docs debe corregirse y dejar registro.
- Este documento se actualiza al cierre de cada fase de desarrollo.
- Ningún módulo puede duplicar entidades definidas en [[Modelo Datos.md]].
- Ningún dato comercial puede existir sin `tenant_id`.
