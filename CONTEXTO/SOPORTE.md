# SOPORTE.md

# OBJETIVO

Definir el sistema de soporte al cliente de Mocoa Market.

Alcance:

- Canales de soporte.
- Tipos de consultas.
- Tiempos de respuesta.
- Escalamiento.
- Base de conocimiento.
- Métricas.
- SUPER_ADMIN y soporte cross-tenant.

Detalle de notificaciones: [[NOTIFICACIONES.md]].

Detalle de monitoreo: [[MONITOREO.md]].

---

# CANALES DE SOPORTE

## WhatsApp (principal)

- Número dedicado de soporte.
- Grupo para clientes activos.
- Respuesta en horario laboral.

## Email

- soporte@mocoastore.alexsters.works.
- Para consultas formales y tickets.

## Teléfono (fase 2)

- Solo para clientes premium.

## In-app (futuro)

- Sistema de tickets integrado.

## Comunidad

- Grupo de WhatsApp de comerciantes.
- Canal de YouTube con tutoriales.

---

# TIPOS DE CONSULTA

## Categorías

| Categoría | Descripción | SLA |
|-----------|-------------|-----|
| Onboarding | Ayuda para empezar a usar | 4 horas |
| Funcionalidad | Cómo hacer X con la plataforma | 4 horas |
| Bug | Error o comportamiento inesperado | 24 horas |
| Pago | Problemas con suscripción | 24 horas |
| Cuenta | Login, recuperación, cambios | 4 horas |
| Capacitación | Enseñar a usar el panel | 24 horas |
| Solicitud especial | Funcionalidad nueva, integración | 72 horas |

## Severidad

- **Crítica**: plataforma caída para el cliente. 1 hora.
- **Alta**: funcionalidad importante no funciona. 4 horas.
- **Media**: inconvenience pero hay workaround. 24 horas.
- **Baja**: pregunta, duda, sugerencia. 72 horas.

---

# HORARIO

## MVP

- Lunes a viernes, 8:00 - 18:00 hora Colombia.
- Sábados 9:00 - 13:00.
- Sin soporte 24/7 en MVP.

## Fuera de horario

- Mensaje automático: "Estamos fuera de horario, te responderemos mañana".
- Tickets críticos (Caída total): escalada al SUPER_ADMIN.

## Fase 2

- Extender a fines de semana.
- Considerar 24/7 para clientes premium.

---

# FLUJO DE TICKET

## MVP: gestión manual

```
Cliente contacta (WhatsApp o email)
  ↓
Equipo de soporte recibe
  ↓
Clasifica (categoría, severidad)
  ↓
Resuelve o escala
  ↓
Responde al cliente
  ↓
Cierra
```

## Tracking

Para MVP, usar hoja de cálculo compartida o herramienta simple (Notion, Trello).

Fase 2: sistema de tickets propio o externo (Zendesk, Freshdesk).

---

# ESCALAMIENTO

## Niveles

### Nivel 1: Front-line support

- Onboarding.
- Preguntas de uso.
- Recuperación de cuenta.
- Reseteo de contraseñas (con verificación).

### Nivel 2: Soporte técnico

- Bugs.
- Errores de plataforma.
- Problemas de rendimiento.
- Issues de datos.

### Nivel 3: Ingeniería

- Bugs complejos.
- Cambios de DB.
- Nuevas funcionalidades urgentes.

### SUPER_ADMIN: Account management

- Suspensiones.
- Cancelaciones.
- Cambios de plan manuales.
- Impersonación para debugging.

## Criterios de escalación

| Condición | Escalar a |
|-----------|-----------|
| No se puede resolver en 24h | Nivel 2 |
| Bug reproducible | Nivel 2 |
| Cambio de DB necesario | Nivel 3 |
| Solicitud de SUPER_ADMIN | SUPER_ADMIN |
| Problema legal/facturación | SUPER_ADMIN |

---

# BASE DE CONOCIMIENTO

## Estructura

- Artículos categorizados.
- Búsqueda.
- Videos tutoriales (futuro).

## Categorías iniciales

- Primeros pasos.
- Inventario.
- POS.
- Pedidos y domicilios.
- Reportes.
- Configuración.
- Suscripción y pagos.
- Problemas comunes (FAQ).

## Formato

- Markdown.
- Capturas de pantalla.
- Pasos numerados.
- Tiempo estimado de lectura.

## Ubicación

- Sitio público: ayuda.mocoastore.alexsters.works.
- Indexado para búsqueda (Google).
- Actualizado con cada release.

---

# RESPUESTAS TIPO

## Plantillas

Para preguntas frecuentes:

- "Cómo crear mi primer producto"
- "Cómo abrir caja en POS"
- "Cómo confirmar un pedido"
- "Cómo cambiar el plan"

## Macros

En WhatsApp Business (cuando esté integrado):

- `/saludo` → mensaje de bienvenida.
- `/onboarding` → link a guía de inicio.
- `/estado` → estado de la plataforma.

---

# SUPER_ADMIN Y SOPORTE

## Herramientas

- Acceso a `AUDIT_LOGS` del tenant (solo si hay consentimiento o sospecha).
- Impersonación (debidamente auditada).
- Capacidad de suspender/reactivar tenants.
- Modificar límites manualmente.

## Proceso

```
Cliente contacta con problema
  ↓
Soporte Nivel 1 intenta resolver
  ↓
Si necesita acceso a datos del tenant:
  - Cliente autoriza (en escrito o verbal grabado)
  - SUPER_ADMIN impersona (registrado en audit)
  - Resuelve
  - Cierra sesión de impersonación
  ↓
Informa al cliente
  ↓
Post-mortem si fue bug
```

## Política de privacidad

- SUPER_ADMIN nunca accede a datos sin necesidad operativa.
- Toda impersonación queda registrada.
- Cliente es informado del acceso.
- Solo datos necesarios para resolver.

---

# MÉTRICAS DE SOPORTE

## KPIs

- Tickets resueltos vs abiertos.
- Tiempo promedio de primera respuesta.
- Tiempo promedio de resolución.
- Satisfacción del cliente (NPS, fase 2).
- Tickets por categoría.
- Tickets reincidentes (mismo problema varias veces).

## Reportes

- Semanal: ticket count, top issues, satisfaction.
- Mensual: trends, training needs, KB gaps.

Detalle: [[REPORTES.md]].

---

# COMUNICACIÓN DE INCIDENTES

## Plataforma caída

```
[Estado público] https://status.mocoastore.alexsters.works
  - Operacional
  - Degradado
  - Caída parcial
  - Caída total
```

## Comunicación a clientes

- Email cuando hay incidente > 30min.
- Actualización cada hora durante incidente.
- Post-mortem público 24-48h después.

## Post-mortem

- Qué pasó.
- Por qué.
- Impacto.
- Acción correctiva.
- Fecha de implementación.

---

# CAPACITACIÓN

## Onboarding de nuevos clientes

1. Llamada de bienvenida (15 min).
2. Configuración inicial asistida (30 min).
3. Sesión de dudas (15 min).
4. Follow-up a los 7 días.
5. Follow-up a los 30 días.

## Tutoriales

- Videos cortos (2-5 min).
- Para cada rol (admin, cajero, domiciliario).
- En español.

## Webinars

- Mensuales para grupos de clientes.
- Temas avanzados.
- Q&A.

---

# ESCALACIÓN A INGENIERÍA

## Para reportar bugs

Template:

```
**Descripción:**
[Qué pasó]

**Pasos para reproducir:**
1. ...
2. ...

**Esperado:**
[Qué debería pasar]

**Actual:**
[Qué pasa]

**Entorno:**
- Navegador:
- Dispositivo:
- Tenant ID (si aplica):
- Hora:

**Capturas:**
[Adjuntar]
```

## Tracking

- Crear ticket en repo.
- Asignar label (bug, priority, module).
- Vincular a milestone.

---

# SOPORTE EN IDIOMAS

- Español: principal.
- Inglés: fase 2 (si hay clientes turistas o expansión).

---

# POLÍTICA DE RESPUESTAS

## Tono

- Amigable pero profesional.
- Empático.
- Solución-orientado.
- Evitar jerga técnica con clientes no técnicos.

## Tiempos

- Primera respuesta: según SLA.
- Actualizaciones: cada 24h si no resuelto.
- Cierre: confirmar con cliente que está resuelto.

## Datos sensibles

- Nunca pedir contraseña.
- Verificar identidad antes de dar información sensible.
- No compartir datos de un cliente con otro.

---

# EVENTOS RELACIONADOS

- `support.ticket.created`
- `support.ticket.responded`
- `support.ticket.resolved`
- `support.ticket.escalated`
- `support.satisfaction.rated`

Detalle: [[EVENTOS.md]].

---

# AUDITORÍA

- `SUPPORT_TICKET_CREATED`
- `SUPPORT_TICKET_RESPONDED`
- `SUPPORT_ACCESS_GRANTED` (cliente autorizó acceso)
- `SUPPORT_IMPERSONATION` (SUPER_ADMIN accedió a tenant)

Detalle: [[AUDITORIA.md]].

---

# REGLAS CRÍTICAS

- Toda interacción con cliente queda registrada.
- Tiempo de respuesta respeta SLA por categoría.
- Escalar cuando se exceda capacidad de resolución.
- Cliente es informado antes de acceder a sus datos.
- SUPER_ADMIN nunca modifica datos sin autorización explícita.
- Post-mortem obligatorio tras incidente > 1h.
- Base de conocimiento actualizada mensualmente.
- Capacitación inicial obligatoria para nuevos clientes.
- Grupo de WhatsApp activo con respuestas < 4h hábiles.
