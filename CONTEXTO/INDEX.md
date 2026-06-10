# INDEX.md

# OBJETIVO

Índice maestro de búsqueda rápida de toda la documentación de Mocoa Market.

Use este documento cuando necesite encontrar el archivo correcto para un tema específico.

Para vista por flujo, ver [[CONTEXTO_GLOBAL.md]].

Para estado de cobertura documental, ver [[ANALISIS_GAPS.md]].

---

# POR TEMA

## Empezar aquí

- [[PROMPT_INICIO.md]] — **Prompt canónico para dar a cualquier IA al iniciar sesión.**
- [[CONTEXTO_GLOBAL.md]] — Visión general, mapa del sistema, índice maestro.
- [[NEGOCIO.MD]] — Plan de negocio, modelo de ingresos, mercado objetivo.
- [[ARQUITECTURA.md]] — Arquitectura técnica, capas, decisiones.
- [[FRONTEND_STACK.md]] — **Stack frontend oficial (shadcn/ui, RHF, Zod, Zustand, TanStack Query, nuqs, etc.).**
- [[REGLAS_IA.md]] — Reglas obligatorias para IAs y LLMs.

## Modelo de datos y base de datos

- [[Modelo Datos.md]] — Entidades, campos, relaciones (FKs).
- [[Base Datos.md]] — Stack PostgreSQL+PostGIS, Redis, MinIO, Prisma.
- [[GEOLOCALIZACION.md]] — PostGIS, índices espaciales, consultas.
- [[MULTI_TENANT.md]] — Aislamiento por tenant_id, middleware Prisma.

## Módulos de negocio

- [[Inventario.md]] — Productos, stock, movimientos, variantes.
- [[POS.md]] — Punto de venta, caja, métodos de pago, arqueo.
- [[CATALOGO_DIGITAL.md]] — Landing pública, carrito, pedidos.
- [[MARKETPLACE.md]] — Directorio, búsqueda, destacados.
- [[CRM_CLIENTE.md]] — Clientes, segmentación, fidelización.
- [[DOMICILIOS.md]] — Pedidos, domiciliario, cobertura.
- [[REPORTES.md]] — Dashboards, métricas, exportaciones.

## Extensiones de negocio

- [[PAGOS.md]] — Pagos, métodos, mixto, contra entrega.
- [[SUSCRIPCIONES.md]] — Planes, ciclo, cambios, límites.
- [[PROMOCIONES.md]] — Descuentos, cupones, combos.
- [[FIDELIZACION.md]] — Puntos, niveles, recompensas.
- [[SUCURSALES.md]] — Multi-sucursal, stock por sucursal.

## Seguridad y acceso

- [[AUTH.md]] — JWT, refresh, login, recuperación.
- [[RBAC.md]] — Roles, permisos por módulo, guards.
- [[MULTI_TENANT.md]] — Aislamiento de tenants.
- [[AUDITORIA.md]] — Qué se audita, retención, exportación.
- [[SEGURIDAD.md]] — Capas, headers, secretos, incidentes.

## Contratos técnicos

- [[API.md]] — REST, versionado, endpoints, errores, paginación.
- [[EVENTOS.md]] — Bus de eventos, catálogo, publishers/subscribers.
- [[WEBSOCKETS.md]] — Socket.io, salas, presencia, reconexión.
- [[CACHE.md]] — Redis, keys, TTL, invalidación.

## Notificaciones y comunicación

- [[NOTIFICACIONES.md]] — In-app, email, WhatsApp deep links.
- [[WHATSAPP.md]] — wa.me, plantillas, generación.
- [[SOPORTE.md]] — Canales, SLA, escalamiento, KB.

## Infraestructura y operaciones

- [[INFRAESTRUCTURA.md]] — VPS, Docker, Contabo, fases.
- [[eviroments.md]] — Variables de entorno, hosts Docker.
- [[DEPLOYMENT.md]] — Pipeline, SSL, Nginx, smoke tests.
- [[CI_CD.md]] — GitHub Actions, workflows, secrets.
- [[BACKUPS.md]] — Frecuencia, retención, RTO/RPO.
- [[MONITOREO.md]] — Prometheus, Grafana, UptimeRobot.
- [[LOGGING.md]] — Pino, JSON, niveles, PII.
- [[INTEGRACIONES.md]] — Catálogo, abstracción, config.

## Testing y calidad

- [[TESTING.md]] — Pirámide, unit, integration, e2e.

## Estructura y código

- [[ESTRUCTURA.md]] — Carpetas, convenciones, nombres.

## Estrategia

- [[ESTRATEGIA_COMERCIAL.md]] — Adquisición, retención, expansión.

## Análisis y estado

- [[ANALISIS_GAPS.md]] — Vacíos documentales, decisiones, riesgos.
- [[INDEX.md]] — Este documento.

---

# POR ROL

## Si eres un nuevo desarrollador

Leer en este orden:

1. [[CONTEXTO_GLOBAL.md]]
2. [[NEGOCIO.MD]]
3. [[ARQUITECTURA.md]]
4. [[ESTRUCTURA.md]]
5. [[Modelo Datos.md]]
6. [[REGLAS_IA.md]]
7. Módulo específico en el que trabajarás.

## Si eres una IA / LLM

**Usa [[PROMPT_INICIO.md]] obligatoriamente al iniciar sesión.**

Orden de lectura:

1. [[PROMPT_INICIO.md]] (lectura de prompts).
2. [[REGLAS_IA.md]] (obligatorio).
3. [[CONTEXTO_GLOBAL.md]].
4. **[[FRONTEND_STACK.md]]** (obligatorio si vas a tocar frontend: librerías, versiones, patrones, riesgos).
5. Documento del módulo que vas a tocar.
6. Documentos transversales relevantes (AUTH, RBAC, MULTI_TENANT, EVENTOS).

## Si eres un stakeholder de negocio

1. [[NEGOCIO.MD]]
2. [[ESTRATEGIA_COMERCIAL.md]]
3. [[CONTEXTO_GLOBAL.md]]
4. [[ANALISIS_GAPS.md]] (estado del proyecto).

## Si eres un operador de infraestructura

1. [[INFRAESTRUCTURA.md]]
2. [[eviroments.md]]
3. [[DEPLOYMENT.md]]
4. [[CI_CD.md]]
5. [[BACKUPS.md]]
6. [[MONITOREO.md]]
7. [[SEGURIDAD.md]]

## Si vas a hacer deploy

1. [[DEPLOYMENT.md]]
2. [[CI_CD.md]]
3. [[BACKUPS.md]]
4. [[INFRAESTRUCTURA.md]]

## Si vas a debuggear un bug

1. [[LOGGING.md]] (cómo se loguea).
2. [[MONITOREO.md]] (cómo se mide).
3. [[AUDITORIA.md]] (qué se audita).
4. Documento del módulo afectado.

---

# POR MÓDULO BACKEND

Cada módulo documentado tiene su contraparte en docs transversales.

| Módulo | Doc principal | Docs relacionados |
|--------|---------------|-------------------|
| auth | [[AUTH.md]] | [[RBAC.md]], [[MULTI_TENANT.md]], [[API.md]] |
| users | [[AUTH.md]], [[RBAC.md]] | [[MULTI_TENANT.md]] |
| tenants | [[MULTI_TENANT.md]] | [[SUSCRIPCIONES.md]] |
| plans | [[SUSCRIPCIONES.md]] | [[Modelo Datos.md]] |
| inventory | [[Inventario.md]] | [[Modelo Datos.md]], [[EVENTOS.md]] |
| suppliers | [[Inventario.md]] | [[Modelo Datos.md]] |
| purchases | [[Inventario.md]] | [[EVENTOS.md]], [[AUDITORIA.md]] |
| pos | [[POS.md]] | [[PAGOS.md]], [[EVENTOS.md]] |
| customers | [[CRM_CLIENTE.md]] | [[FIDELIZACION.md]], [[EVENTOS.md]] |
| orders | [[DOMICILIOS.md]], [[CATALOGO_DIGITAL.md]] | [[PAGOS.md]], [[EVENTOS.md]] |
| delivery | [[DOMICILIOS.md]] | [[GEOLOCALIZACION.md]], [[EVENTOS.md]] |
| marketplace | [[MARKETPLACE.md]] | [[GEOLOCALIZACION.md]], [[CATALOGO_DIGITAL.md]] |
| reports | [[REPORTES.md]] | [[CACHE.md]] |
| settings | [[MULTI_TENANT.md]], [[SUCURSALES.md]] | [[Modelo Datos.md]] |
| audit | [[AUDITORIA.md]] | [[EVENTOS.md]], [[MULTI_TENANT.md]] |
| notifications | [[NOTIFICACIONES.md]] | [[EVENTOS.md]], [[WHATSAPP.md]] |
| promotions | [[PROMOCIONES.md]] | [[EVENTOS.md]] |
| subscriptions | [[SUSCRIPCIONES.md]] | [[PAGOS.md]], [[EVENTOS.md]] |
| loyalty | [[FIDELIZACION.md]] | [[CRM_CLIENTE.md]], [[EVENTOS.md]] |
| branches | [[SUCURSALES.md]] | [[MULTI_TENANT.md]], [[EVENTOS.md]] |

---

# BÚSQUEDA POR PALABRA CLAVE

## A

- **API**: [[API.md]]
- **Auditoría**: [[AUDITORIA.md]]
- **Auth**: [[AUTH.md]]
- **Almacenamiento**: [[Base Datos.md]], [[INFRAESTRUCTURA.md]]

## B

- **Backups**: [[BACKUPS.md]]
- **Base de datos**: [[Base Datos.md]]
- **Búsqueda (marketplace)**: [[MARKETPLACE.md]]
- **BullMQ**: [[EVENTOS.md]]

## C

- **Cache**: [[CACHE.md]]
- **Catálogo digital**: [[CATALOGO_DIGITAL.md]]
- **CI/CD**: [[CI_CD.md]]
- **Clientes (CRM)**: [[CRM_CLIENTE.md]]
- **Compras**: [[Inventario.md]]
- **Caja**: [[POS.md]]
- **Contenedores**: [[INFRAESTRUCTURA.md]]

## D

- **Domicilios**: [[DOMICILIOS.md]]
- **Deploy**: [[DEPLOYMENT.md]]
- **Docker**: [[INFRAESTRUCTURA.md]]

## E

- **Email**: [[NOTIFICACIONES.md]]
- **Eventos**: [[EVENTOS.md]]
- **Estructura**: [[ESTRUCTURA.md]]
- **Estrategia comercial**: [[ESTRATEGIA_COMERCIAL.md]]

## F

- **Fidelización**: [[FIDELIZACION.md]]
- **Frontend**: [[ESTRUCTURA.md]]

## G

- **Geolocalización**: [[GEOLOCALIZACION.md]]
- **Grafana**: [[MONITOREO.md]]

## H

- **HTTPS**: [[SEGURIDAD.md]], [[DEPLOYMENT.md]]

## I

- **Inventario**: [[Inventario.md]]
- **Integraciones**: [[INTEGRACIONES.md]]
- **IA / LLM**: [[REGLAS_IA.md]]

## J

- **JWT**: [[AUTH.md]]

## L

- **Logging**: [[LOGGING.md]]
- **Leaflet**: [[GEOLOCALIZACION.md]]

## M

- **Marketplace**: [[MARKETPLACE.md]]
- **Multi-tenant**: [[MULTI_TENANT.md]]
- **Monitoreo**: [[MONITOREO.md]]
- **Modelo de datos**: [[Modelo Datos.md]]
- **Mapas**: [[GEOLOCALIZACION.md]]

## N

- **Negocio**: [[NEGOCIO.MD]]
- **Nginx**: [[DEPLOYMENT.md]]
- **Notificaciones**: [[NOTIFICACIONES.md]]

## O

- **OAuth**: [[AUTH.md]]
- **Observabilidad**: [[MONITOREO.md]], [[LOGGING.md]]

## P

- **Pagos**: [[PAGOS.md]]
- **Permisos**: [[RBAC.md]]
- **Postgres**: [[Base Datos.md]]
- **PostGIS**: [[GEOLOCALIZACION.md]], [[Base Datos.md]]
- **POS**: [[POS.md]]
- **Prisma**: [[Base Datos.md]], [[MULTI_TENANT.md]]
- **Promociones**: [[PROMOCIONES.md]]
- **Push (WebSockets)**: [[WEBSOCKETS.md]]

## R

- **RBAC**: [[RBAC.md]]
- **React**: [[ESTRUCTURA.md]]
- **Redis**: [[Base Datos.md]], [[CACHE.md]]
- **Reportes**: [[REPORTES.md]]
- **Resend**: [[NOTIFICACIONES.md]]
- **Roles**: [[RBAC.md]]

## S

- **Seguridad**: [[SEGURIDAD.md]]
- **Suscripciones**: [[SUSCRIPCIONES.md]]
- **Sucursales**: [[SUCURSALES.md]]
- **Soporte**: [[SOPORTE.md]]
- **Socket.io**: [[WEBSOCKETS.md]]
- **SSL/TLS**: [[DEPLOYMENT.md]], [[SEGURIDAD.md]]
- **Super admin**: [[AUTH.md]], [[RBAC.md]], [[MULTI_TENANT.md]]

## T

- **Tenant**: [[MULTI_TENANT.md]]
- **Testing**: [[TESTING.md]]
- **Tracking**: [[GEOLOCALIZACION.md]], [[DOMICILIOS.md]] (fase 2)

## U

- **Usuarios**: [[AUTH.md]], [[RBAC.md]]

## V

- **Variantes (productos)**: [[Inventario.md]], [[Modelo Datos.md]]
- **VPS**: [[INFRAESTRUCTURA.md]]

## W

- **wa.me**: [[WHATSAPP.md]]
- **WebSockets**: [[WEBSOCKETS.md]]
- **WhatsApp**: [[WHATSAPP.md]]

---

# ESTADÍSTICAS

- **Total documentos:** 43
- **Documentos fundacionales:** 10
- **Módulos de negocio:** 7
- **Documentos transversales:** 8
- **Documentos operativos:** 10
- **Documentos de extensiones:** 7
- **Documentos de cierre:** 2 (incluyendo este)
- **Tamaño promedio por doc:** ~600 líneas
- **Cobertura documental:** 95%

---

# REGLAS DE MANTENIMIENTO

- Este índice se actualiza cuando se crean o eliminan documentos.
- Mantener ordenamiento por tema, rol, módulo, palabra clave.
- Verificar enlaces rotos trimestralmente.
- El índice debe caber en una pantalla (resumen).
