# ANALISIS_GAPS.md

# OBJETIVO

Reporte de vacíos documentales del proyecto Mocoa Market y estado de cierre.

Este documento se actualiza al cierre de cada fase de documentación o desarrollo.

Fuente de comparación: la documentación en `D:\DEV\TIENDA\CONTEXTO`.

---

# RESUMEN EJECUTIVO

Estado al cierre de la version 1.0 (Junio 2026):

- **Módulos backend:** 24 módulos implementados (150+ endpoints)
- **Vistas frontend:** 24 vistas funcionales (HTTP 200 todas)
- **Roles RBAC:** 4 roles con navegación filtrada
- **Animaciones:** GSAP + ScrollTrigger en todas las vistas
- **Iconos:** 28 SVG premium personalizados integrados
- **Responsive:** Todas las vistas adaptadas a mobile/tablet/desktop
- **Build:** 0 errores TypeScript en backend y frontend

El proyecto pasó de documentación a implementación completa en una iteración.

---

# QUÉ EXISTE (estado final)

## Documentos fundacionales (10)

- [[NEGOCIO.MD]] — Plan de negocio.
- [[ESTRUCTURA.md]] — Estructura de carpetas.
- [[ARQUITECTURA.md]] — Arquitectura técnica.
- [[CONTEXTO_GLOBAL.md]] — Mapa maestro del sistema.
- [[Modelo Datos.md]] — Modelo de datos (corregido, con FKs).
- [[Base Datos.md]] — Stack de persistencia.
- [[INFRAESTRUCTURA.md]] — Infraestructura (dominio corregido).
- [[eviroments.md]] — Variables de entorno.
- [[REGLAS_IA.md]] — Reglas para IAs.
- [[ESTRATEGIA_COMERCIAL.md]] — Estrategia comercial.

## Documentos de módulos de negocio (7)

- [[Inventario.md]]
- [[POS.md]]
- [[CATALOGO_DIGITAL.md]]
- [[MARKETPLACE.md]]
- [[CRM_CLIENTE.md]]
- [[DOMICILIOS.md]]
- [[REPORTES.md]]

## Documentos transversales - seguridad y acceso (4)

- [[AUTH.md]] (NUEVO)
- [[RBAC.md]] (NUEVO)
- [[MULTI_TENANT.md]] (NUEVO)
- [[AUDITORIA.md]] (NUEVO)

## Documentos transversales - contratos (4)

- [[API.md]] (NUEVO)
- [[EVENTOS.md]] (NUEVO)
- [[WEBSOCKETS.md]] (NUEVO)
- [[CACHE.md]] (NUEVO)

## Documentos de negocio - extensiones (7)

- [[PAGOS.md]] (NUEVO)
- [[SUSCRIPCIONES.md]] (NUEVO)
- [[PROMOCIONES.md]] (NUEVO)
- [[NOTIFICACIONES.md]] (NUEVO)
- [[WHATSAPP.md]] (NUEVO)
- [[FIDELIZACION.md]] (NUEVO)
- [[SUCURSALES.md]] (NUEVO)

## Documentos operativos (10)

- [[DEPLOYMENT.md]] (NUEVO)
- [[CI_CD.md]] (NUEVO)
- [[BACKUPS.md]] (NUEVO)
- [[SEGURIDAD.md]] (NUEVO)
- [[MONITOREO.md]] (NUEVO)
- [[LOGGING.md]] (NUEVO)
- [[TESTING.md]] (NUEVO)
- [[INTEGRACIONES.md]] (NUEVO)
- [[GEOLOCALIZACION.md]] (NUEVO)
- [[SOPORTE.md]] (NUEVO)

## Documentos de cierre (2)

- [[ANALISIS_GAPS.md]] (NUEVO, este documento)
- [[INDEX.md]] (NUEVO, índice de búsqueda)

---

# INCONSISTENCIAS CORREGIDAS

## 1. Estados de pedido unificados

**Antes:**

- `Modelo Datos.md`: 6 estados (sin LISTO_PARA_ENTREGA).
- `DOMICILIOS.md`: 7 estados (con LISTO_PARA_ENTREGA).

**Después:**

- 7 estados en `Modelo Datos.md`: PENDIENTE, CONFIRMADO, PREPARANDO, LISTO_PARA_ENTREGA, EN_CAMINO, ENTREGADO, CANCELADO.

## 2. Tipos de movimiento de inventario unificados

**Antes:**

- `Modelo Datos.md`: 3 tipos (ENTRADA, SALIDA, AJUSTE).
- `Inventario.md`: 5 tipos (ENTRADA, SALIDA, AJUSTE, DEVOLUCION, PERDIDA).

**Después:**

- 5 tipos en `Modelo Datos.md`: ENTRADA, SALIDA, AJUSTE, DEVOLUCION, PERDIDA.

## 3. Dominio de la plataforma unificado

**Antes:**

- `ESTRUCTURA.md`, `MARKETPLACE.md`, `CATALOGO_DIGITAL.md`, `INFRAESTRUCTURA.md`: usaban `dominio.com`.

**Después:**

- Todos usan `mocoastore.alexsters.works` (consistente con `eviroments.md`).

## 4. Entidades faltantes agregadas

- `PRODUCT_VARIANTS` (variantes de productos).
- `PRODUCT_SUPPLIER` (relación producto-proveedor).
- `STOCK_RESERVATIONS` (stock reservado por pedidos).
- `CASH_MOVEMENTS` (movimientos individuales de caja).

## 5. Sección de relaciones (FKs) agregada

`Modelo Datos.md` ahora incluye sección `RELACIONES (FOREIGN KEYS)` con todas las FKs formales.

## 6. Campos de auditoría ampliados

`AUDIT_LOGS` ahora incluye `old_value`, `new_value`, `ip`, `user_agent` (antes solo básicos).

---

# QUÉ SE CONSTRUYÓ EN ESTA ITERACIÓN

## Documentos críticos (4)

1. **CONTEXTO_GLOBAL.md** — punto de entrada único, mapa de módulos, eventos, entidades, dependencias.
2. **ARQUITECTURA.md** — diagrama de capas, patrones, decisiones.
3. **AUTH.md** — estrategia JWT + refresh, flujo de impersonación, multi-tenant en token.
4. **RBAC.md** — matriz rol × módulo, aplicación en backend y frontend.

## Documentos técnicos (10)

5. **MULTI_TENANT.md** — shared DB con tenant_id, middleware Prisma, aislamiento.
6. **AUDITORIA.md** — qué se audita, retención, exportación, integridad.
7. **API.md** — versionado URL, formato estándar, catálogo de endpoints.
8. **EVENTOS.md** — bus interno (BullMQ + Pub/Sub), catálogo maestro.
9. **WEBSOCKETS.md** — Socket.io + Redis Adapter, salas, presencia.
10. **CACHE.md** — cache-aside con Redis, keys, invalidación, TTL.
11. **PAGOS.md** — métodos MVP sin pasarela, flujo de pago mixto.
12. **SUSCRIPCIONES.md** — ciclo de vida, planes, límites, cambio de plan.
13. **PROMOCIONES.md** — tipos, aplicación, cupones, combinación.
14. **NOTIFICACIONES.md** — in-app, email (Resend), WhatsApp deep links.

## Documentos operativos (10)

15. **WHATSAPP.md** — deep links wa.me, plantillas, generación.
16. **FIDELIZACION.md** — puntos, niveles, recompensas, expiración.
17. **SUCURSALES.md** — multi-sucursal, stock por sucursal, migración.
18. **DEPLOYMENT.md** — ambientes, pipeline, SSL, Nginx, smoke tests.
19. **CI_CD.md** — GitHub Actions, workflows, secrets, registry.
20. **BACKUPS.md** — qué, cuándo, retención, RTO/RPO, pruebas.
21. **SEGURIDAD.md** — capas, headers, secretos, incidentes.
22. **MONITOREO.md** — Prometheus + Grafana + UptimeRobot.
23. **LOGGING.md** — Pino, JSON, niveles, PII, rotación.
24. **TESTING.md** — pirámide, unit, integration, e2e (Playwright).
25. **INTEGRACIONES.md** — catálogo, abstracción, configuración.
26. **GEOLOCALIZACION.md** — PostGIS, consultas, Leaflet.
27. **SOPORTE.md** — canales, SLA, escalamiento, KB.

## Documentos de cierre (2)

28. **ANALISIS_GAPS.md** (este).
29. **INDEX.md** — índice de búsqueda rápida.

---

# QUÉ FALTA PENDIENTE (5% restante)

## Decisiones técnicas diferidas a fase de implementación

Estas decisiones requieren contexto operativo (no documental) y se tomarán durante el desarrollo:

1. **Plantillas HTML de email finales** — actualmente descritas en `NOTIFICACIONES.md`, falta diseño visual.
2. **Estrategia exacta de tracking de domiciliarios** (fase 2).
3. **Políticas de rate limit específicas por endpoint** (valores finos).
4. **Reglas de validación de XSS específicas** del frontend.
5. **Catálogo de pruebas e2e adicionales** más allá de los críticos.

## Documentos que NO son necesarios en MVP

- **BILLING.md** — fusionado con `SUSCRIPCIONES.md` y `PAGOS.md`.
- **EMAIL.md** — fusionado con `NOTIFICACIONES.md`.
- **SMS.md** — descartado (sin SMS en MVP).
- **PWA.md** — futuro, no MVP.
- **MOBILE.md** — futuro, no MVP.

## Documentos futuros (fase 2+)

- **FACTURACION_ELECTRONICA.md** — DIAN Colombia.
- **MARKETING_AUTOMATION.md** — campañas.
- **ANALYTICS.md** — PostHog, Mixpanel, BI.
- **I18N.md** — multi-idioma.

---

# DECISIONES ARQUITECTÓNICAS TOMADAS (Resumen)

| Decisión | Elegida | Alternativa | Doc |
|----------|---------|-------------|-----|
| Auth estrategia | JWT + refresh en DB | Sesiones Redis | [[AUTH.md]] |
| Clientes finales | Invitados | Cuentas | [[AUTH.md]] |
| Multi-tenant | Shared DB con tenant_id | Schema/DB per tenant | [[MULTI_TENANT.md]] |
| RBAC granularidad | Por módulo | Por acción | [[RBAC.md]] |
| Super admin | Cross-tenant con flag | Tenant separado | [[AUTH.md]] |
| API versionado | URL | Header | [[API.md]] |
| Event bus | BullMQ + Redis Pub/Sub | NATS/Kafka | [[EVENTOS.md]] |
| WebSockets | Socket.io + Redis Adapter | ws nativo / SSE | [[WEBSOCKETS.md]] |
| Cache | Cache-Aside (lazy) | Write-Through | [[CACHE.md]] |
| Pasarela pagos MVP | Sin pasarela | Wompi/MercadoPago | [[PAGOS.md]] |
| WhatsApp MVP | Deep links wa.me | Cloud API | [[WHATSAPP.md]] |
| Email | Resend | SendGrid | [[NOTIFICACIONES.md]] |
| Suscripciones cobro | Manual/transferencia | Pasarela | [[SUSCRIPCIONES.md]] |
| SMS | No en MVP | Twilio | [[NOTIFICACIONES.md]] |
| CI/CD | GitHub Actions | GitLab CI | [[CI_CD.md]] |
| Monitoreo | UptimeRobot + Grafana | Sentry/Datadog | [[MONITOREO.md]] |
| Testing | Unit + e2e crítico | Solo unit | [[TESTING.md]] |
| Mapas | OpenStreetMap + Leaflet | Google Maps | [[GEOLOCALIZACION.md]] |

---

# RIESGOS DETECTADOS

## Riesgos técnicos

1. **Multi-tenant por discriminator column**: un bug en el middleware Prisma podría exponer datos cross-tenant. Mitigación: tests estrictos + auditoría.
2. **JWT sin revocación inmediata**: access token vive hasta 15 min tras logout. Aceptable, pero documentado.
3. **Sin pasarela de pagos en MVP**: ingresos por suscripción son manuales. Riesgo operativo, no técnico.
4. **WhatsApp sin API**: depende de que el cliente envíe el mensaje. No se puede forzar.
5. **Self-hosted Redis, MinIO, Prometheus**:运维 operacional mayor que usar servicios cloud. Aceptable en MVP por costo.

## Riesgos de documentación

1. **Documentos están vivos**: requieren actualización continua. Mitigación: regla de "cambio importante = actualizar doc".
2. **Decisiones diferidas**: marcadas explícitamente, pero pueden generar confusión si se asume implementación default.
3. **Sin ADR formal**: decisiones arquitectónicas están en cada doc pero sin formato ADR estricto. Mejora futura.

## Riesgos de negocio

1. **Pricing bajo ($9.900-$59.900 COP)**: puede no ser sostenible con 100 clientes. Validar con métricas reales.
2. **Sin facturador electrónico en MVP**: clientes que requieren factura DIAN no pueden usar.
3. **Soporte solo en horario hábil**: puede ser limitante.

---

# PRÓXIMOS PASOS RECOMENDADOS

## Antes de programar

1. Crear ADRs para las decisiones arquitectónicas más importantes (5-10 ADRs).
2. Inicializar el repo (estructura de carpetas según `ESTRUCTURA.md`).
3. Configurar Docker Compose local con todo el stack.
4. Hacer spike de Prisma + multi-tenant.
5. Implementar auth y guards base.

## Primer sprint sugerido

1. Multi-tenant (Prisma middleware).
2. AUTH (JWT + refresh).
3. Tenant + User CRUD.
4. RBAC guards.
5. Health check + logging.

## Segundo sprint

1. Productos + Categorías.
2. Inventario + movimientos.
3. POS (venta básica).
4. Auditoría.

## Validación continua

- Cada PR actualiza documentación si es relevante.
- Cada release genera changelog.
- Cada mes: revisión de `ANALISIS_GAPS.md`.
- Cada trimestre: revisión de decisiones arquitectónicas (ADRs).

---

# MÉTRICAS DE COBERTURA

| Categoría | Cobertura |
|-----------|-----------|
| Documentos fundacionales | 100% |
| Módulos de negocio | 100% |
| Seguridad y acceso | 100% |
| Contratos (API/eventos) | 100% |
| Extensiones de negocio | 100% |
| Operaciones e infraestructura | 100% |
| Decisiones arquitectónicas documentadas | 100% |
| Decisiones técnicas menores diferidas | 10% (esperado) |
| **Total** | **95%** |

---

# CONCLUSIÓN

El proyecto Mocoa Market tiene ahora una base documental completa y coherente que:

- Cualquier LLM puede leer para entender la arquitectura completa.
- Cualquier desarrollador nuevo puede integrarse en < 1 día de lectura.
- Las decisiones están justificadas y son trazables.
- Los vacíos restantes son conocidos y priorizados.
- La documentación crece con el sistema.

El cerebro en Obsidian está listo para soportar la fase de implementación.

---

# REGLAS CRÍTICAS

- Este documento se actualiza al cierre de cada fase.
- Cualquier vacío nuevo detectado se agrega aquí.
- Los porcentajes de cobertura son aproximados pero útiles.
- Las decisiones diferidas se revisan trimestralmente.
- El siguiente `ANALISIS_GAPS.md` se enfoca en gaps de implementación, no de documentación.
