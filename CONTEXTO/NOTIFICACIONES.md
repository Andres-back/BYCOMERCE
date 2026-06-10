# NOTIFICACIONES.md

# OBJETIVO

Definir el sistema de notificaciones de Mocoa Market.

Alcance:

- Canales (in-app, email, WhatsApp).
- Tipos de notificaciones.
- Plantillas.
- Triggers.
- Preferencias del usuario.
- Centro de notificaciones in-app.

Detalle de WhatsApp: [[WHATSAPP.md]].

Detalle de email: integración con Resend documentada en este archivo.

Detalle de eventos: [[EVENTOS.md]].

---

# CANALES

## In-app (WebSocket + persistencia)

Notificación visible en el panel del usuario (admin, cajero, domiciliario).

Características:

- Persistente (se guarda en DB).
- Se entrega vía WebSocket si está conectado.
- Visible en centro de notificaciones al recargar.

## Email

Para:

- ADMIN_NEGOCIO: bienvenida, pagos, vencimientos, alertas críticas.
- Clientes: confirmación de pedido, comprobante, estado.

Proveedor: **Resend**.

## WhatsApp (deep links wa.me)

**Sin integración API en MVP.**

Para clientes, se generan URLs de WhatsApp con mensaje pre-llenado:

```
https://wa.me/57{telefonoComercio}?text={mensajeCodificado}
```

Se abren al hacer clic y pre-llenan el chat del cliente con el comercio.

Para empleados internos, no se usa WhatsApp.

Detalle: [[WHATSAPP.md]].

---

# MODELO DE DATOS

## NOTIFICATIONS (nueva)

```typescript
{
  id, tenantId,
  userId,  // destinatario (usuario interno)
  tipo,  // código de la notificación
  titulo, mensaje,
  level,  // INFO, WARNING, ERROR, SUCCESS
  data (JSON),  // payload adicional
  leida (bool),
  leidaAt (nullable),
  actionUrl (nullable),  // URL a la que apunta
  expiresAt (nullable),
  createdAt
}
```

Índices:

- (tenantId, userId, createdAt DESC)
- (tenantId, userId, leida, createdAt DESC)

## NOTIFICATION_TEMPLATES (nueva)

```typescript
{
  id, tenantId (nullable para globales),
  codigo,  // PEDIDO_CONFIRMADO, etc
  nombre,
  canales (JSON),  // { inApp: true, email: true, whatsapp: false }
  asuntoEmail (nullable),
  plantillaEmail (HTML),
  plantillaInApp (texto),
  plantillaWhatsApp (nullable),  // mensaje wa.me
  variables (text[]),  // nombres de variables esperadas
  estado,
  createdAt, updatedAt
}
```

## NOTIFICATION_PREFERENCES (nueva)

Preferencias por usuario.

```typescript
{
  id, userId,
  tipo,  // código de notificación
  canal,
  activo (bool)
}
```

## EMAIL_LOG (nueva)

Registro de emails enviados.

```typescript
{
  id, tenantId,
  destinatarioEmail,
  plantillaCodigo,
  payload (JSON),
  resendId (nullable),
  estado (ENVIADO, FALLIDO, PENDIENTE),
  error (nullable),
  fecha
}
```

---

# TIPOS DE NOTIFICACIONES

## Para usuarios internos (in-app + email)

| Código | Trigger | In-app | Email | Prioridad |
|--------|---------|--------|-------|-----------|
| `STOCK_BAJO` | stock < stockMinimo | ✅ | ✅ (ADMIN) | MEDIUM |
| `PEDIDO_NUEVO` | pedido creado en comercio | ✅ | ✅ | HIGH |
| `PEDIDO_CANCELADO` | pedido cancelado | ✅ | ✅ | MEDIUM |
| `PAGO_RECIBIDO` | suscripción renovada | ✅ | ✅ | LOW |
| `SUSCRIPCION_VENCER` | T-7 días | ✅ | ✅ | HIGH |
| `SUSCRIPCION_VENCIDA` | día del vencimiento | ✅ | ✅ | HIGH |
| `LIMITE_EXCEDIDO` | al intentar superar plan | ✅ | ✅ | MEDIUM |
| `USUARIO_NUEVO` | admin invitó usuario | ❌ | ✅ (invitado) | MEDIUM |
| `LOGIN_SOSPRAILOSO` | login desde IP nueva | ❌ | ✅ | HIGH |
| `PASSWORD_CAMBIADO` | contraseña actualizada | ❌ | ✅ | MEDIUM |
| `IMPERSONATION_INICIADA` | SUPER_ADMIN impersona | ❌ | ✅ (al usuario original) | HIGH |
| `BACKUP_FALLIDO` | job de backup falló | ✅ | ✅ (SUPER_ADMIN) | HIGH |
| `ERROR_CRITICO` | error 5xx repetido | ✅ | ✅ (SUPER_ADMIN) | HIGH |
| `REPORTE_LISTO` | reporte async completado | ✅ | ✅ | LOW |
| `EXPORTACION_LISTA` | exportación completada | ✅ | ✅ | LOW |

## Para clientes (email + WhatsApp deep link)

| Código | Trigger | Email | WhatsApp | Prioridad |
|--------|---------|-------|----------|-----------|
| `PEDIDO_RECIBIDO` | comercio recibe pedido | ✅ | ✅ | HIGH |
| `PEDIDO_CONFIRMADO` | comercio confirma | ✅ | ✅ | HIGH |
| `PEDIDO_RECHAZADO` | comercio rechaza | ✅ | ✅ | HIGH |
| `PEDIDO_EN_CAMINO` | domiciliarioassigned | ✅ | ✅ | HIGH |
| `PEDIDO_ENTREGADO` | entrega confirmada | ✅ | ✅ | MEDIUM |
| `PEDIDO_CANCELADO` | cancelación | ✅ | ✅ | MEDIUM |
| `BIENVENIDA` | primer pedido | ✅ | ❌ | LOW |

---

# PLANTILLAS

## Variables disponibles

Cualquier plantilla puede usar:

- `{{tenant.nombre}}`
- `{{tenant.whatsapp}}`
- `{{tenant.telefono}}`
- `{{user.nombre}}`
- `{{order.id}}`
- `{{order.total}}`
- `{{order.tracking_url}}`
- `{{customer.nombre}}`
- `{{product.nombre}}`
- `{{product.stock}}`
- `{{product.stockMinimo}}`
- `{{subscription.fechaFin}}`
- `{{subscription.planNombre}}`
- `{{payment.monto}}`

## Ejemplo de plantilla (in-app)

```typescript
{
  codigo: 'STOCK_BAJO',
  plantillaInApp: '{{product.nombre}} tiene solo {{product.stock}} unidades (mínimo {{product.stockMinimo}})',
  actionUrl: '/admin/inventory/products/{{product.id}}',
}
```

## Ejemplo de plantilla (email HTML)

```html
<h2>Stock bajo</h2>
<p>El producto <strong>{{product.nombre}}</strong> tiene solo <strong>{{product.stock}}</strong> unidades.</p>
<p>Has alcanzado el stock mínimo configurado de {{product.stockMinimo}}.</p>
<a href="{{product.url}}" class="btn">Ver producto</a>
```

## Ejemplo de plantilla (WhatsApp deep link)

```
https://wa.me/57{{tenant.whatsapp}}?text=Hola%20{{tenant.nombre}}%2C%20necesito%20confirmar%20mi%20pedido%20%23{{order.id}}
```

Mensaje pre-llenado: "Hola {comercio}, necesito confirmar mi pedido #{id}".

---

# FLUJOS

## Envío de notificación in-app

```typescript
async notificar(userId: string, codigo: string, data: any) {
  const template = await this.getTemplate(codigo, 'IN_APP');
  if (!template) return;

  const notificacion = await this.prisma.notification.create({
    data: {
      tenantId: this.tenantContext.get(),
      userId,
      tipo: codigo,
      titulo: this.render(template.titulo, data),
      mensaje: this.render(template.mensaje, data),
      level: template.level,
      data,
      actionUrl: this.render(template.actionUrl, data),
    },
  });

  // Push via WebSocket
  this.realtimeService.emitToUser(
    notificacion.tenantId,
    userId,
    'notification',
    notificacion,
  );
}
```

## Envío de email

```typescript
async enviarEmail(to: string, codigo: string, data: any) {
  const template = await this.getTemplate(codigo, 'EMAIL');
  if (!template) return;

  const html = this.render(template.plantillaEmail, data);

  try {
    const result = await this.resend.emails.send({
      from: 'Mocoa Market <no-reply@mocoastore.alexsters.works>',
      to,
      subject: this.render(template.asuntoEmail, data),
      html,
    });

    await this.prisma.emailLog.create({
      data: {
        tenantId: this.tenantContext.get(),
        destinatarioEmail: to,
        plantillaCodigo: codigo,
        payload: data,
        resendId: result.data.id,
        estado: 'ENVIADO',
      },
    });
  } catch (err) {
    await this.prisma.emailLog.create({
      data: {
        tenantId: this.tenantContext.get(),
        destinatarioEmail: to,
        plantillaCodigo: codigo,
        payload: data,
        estado: 'FALLIDO',
        error: err.message,
      },
    });

    // Reintentar hasta 3 veces
    throw err;  // BullMQ maneja el retry
  }
}
```

## WhatsApp deep link

```typescript
generarWhatsAppLink(tenant: Tenant, order: Order, messageTemplate: string) {
  const mensaje = this.render(messageTemplate, {
    tenant: { nombre: tenant.nombre },
    order: { id: order.id, total: order.total },
  });
  const mensajeEncoded = encodeURIComponent(mensaje);
  return `https://wa.me/57${tenant.whatsapp}?text=${mensajeEncoded}`;
}
```

El link se incluye en el email o en la página de "gracias" tras hacer pedido.

---

# CONFIGURACIÓN DE RESEND

Variables de entorno:

```
RESEND_API_KEY=<api-key>
EMAIL_FROM=no-reply@mocoastore.alexsters.works
EMAIL_REPLY_TO=soporte@mocoastore.alexsters.works
```

Límites:

- Plan free de Resend: 3.000 emails/mes, 100/día.
- Plan Pro: 50.000 emails/mes desde USD 20/mes.

Para MVP, free es suficiente. Monitorear y migrar cuando se acerque al límite.

---

# PREFERENCIAS DEL USUARIO

Cada usuario puede configurar qué notificaciones recibir y por qué canal.

UI en `/admin/settings/notifications`.

Default:

- Todas activas para in-app.
- Solo críticas para email.

Respetar siempre las preferencias para canales no-críticos.

Las notificaciones críticas (seguridad, pagos) no se pueden desactivar.

---

# CENTRO DE NOTIFICACIONES IN-APP

UI en la campana del header.

Funciones:

- Listar notificaciones no leídas (top 20).
- Marcar como leída.
- Marcar todas como leídas.
- Click → actionUrl.
- Polling cada 30s si WS no disponible.

Endpoints:

```
GET    /api/v1/notifications?unread=true
PATCH  /api/v1/notifications/:id/read
PATCH  /api/v1/notifications/read-all
GET    /api/v1/notifications/preferences
PATCH  /api/v1/notifications/preferences
```

Detalle: [[API.md]].

---

# COLA DE ENVÍO

Todas las notificaciones email y WhatsApp pasan por BullMQ.

```typescript
await this.emailQueue.add('send', {
  to, codigo, data,
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
});
```

Workers procesan y registran en `EMAIL_LOG`.

Detalle: [[EVENTOS.md]].

---

# EVENTOS RELACIONADOS

- `notification.created`
- `notification.read`
- `notification.sent.email`
- `notification.failed.email`
- `notification.sent.whatsapp`
- `notification.delivered.realtime`

Detalle: [[EVENTOS.md]].

---

# AUDITORÍA

- `NOTIFICATION_SENT`
- `NOTIFICATION_FAILED`
- `NOTIFICATION_PREFERENCES_UPDATED`

Detalle: [[AUDITORIA.md]].

---

# ROLES Y PERMISOS

| Acción | ADMIN_NEGOCIO | SUPERVISOR | CAJERO |
|--------|---------------|------------|--------|
| Ver sus notificaciones | ✅ | ✅ | ✅ |
| Configurar preferencias | ✅ | ✅ | ✅ |
| Ver notificaciones de otros | ❌ | ❌ | ❌ |
| Configurar plantillas (tenant) | ✅ | ❌ | ❌ |
| Reenviar email fallido | ✅ | ❌ | ❌ |

Detalle: [[RBAC.md]].

---

# REGLAS CRÍTICAS

- Las notificaciones críticas NUNCA se pueden desactivar.
- Todo envío de email se registra en `EMAIL_LOG`.
- Plantillas en español por defecto (i18n futura).
- Variables no encontradas se loguean como warning, no fallan.
- Reintentos de email con backoff exponencial.
- El rate limit de Resend se respeta (no más de 100 emails/día en free).
- Las notificaciones in-app tienen TTL configurable (default 30 días).
- Mensajes WhatsApp nunca contienen datos sensibles (URLs sin tokens).
- Si WebSocket está caído, se muestra en próximo polling.
