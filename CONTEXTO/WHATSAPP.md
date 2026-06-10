# WHATSAPP.md

# OBJETIVO

Definir la integración de Mocoa Market con WhatsApp.

Alcance:

- Estrategia MVP (deep links wa.me).
- Mensajes pre-llenados.
- Generación automática de links.
- Plantillas.
- Casos de uso.

Detalle de notificaciones: [[NOTIFICACIONES.md]].

Detalle del módulo de pedidos: [[DOMICILIOS.md]].

Detalle del catálogo: [[CATALOGO_DIGITAL.md]].

---

# DECISIÓN MVP

**Sin integración con WhatsApp Business API en MVP.**

Se usan **deep links wa.me** que abren WhatsApp con un mensaje pre-llenado.

Ejemplo de URL generada:

```
https://wa.me/573001234567?text=Hola%20Zapateria%20Andres%2C%20deseo%20hacer%20un%20pedido
```

Cuando el cliente hace clic:

1. Se abre WhatsApp (app móvil o web).
2. El chat con el número del comercio se abre.
3. El mensaje está pre-llenado.
4. El cliente solo presiona "Enviar".

Razón:

- Sin aprobación de Meta.
- Sin costo por mensaje.
- Sin mantener conexión (Baileys) que puede ser baneada.
- Suficiente para el flujo de pedidos pequeños.
- Compatible con la realidad de los comerciantes (ya usan WhatsApp).

Ruta de evolución (Fase 2):

- Integrar WhatsApp Business API (Meta Cloud API) para envío programático.
- Plantillas aprobadas por Meta.
- Webhook de entrada para leer respuestas.

---

# CÓMO FUNCIONA EL DEEP LINK

## Formato

```
https://wa.me/{códigoPaís}{número}?text={mensaje URL-encoded}
```

Ejemplo Colombia:

```
https://wa.me/573001234567?text=Hola
```

## Número del comercio

Cada `TENANT` tiene un campo `whatsapp` (número con código de país, sin `+`).

Validación:

- Sin espacios.
- Sin guiones.
- Sin el signo `+`.
- Con código de país (57 para Colombia).

Ejemplo válido: `573001234567`.

Ejemplo inválido: `+57 300 123 4567`.

## Encoding del mensaje

El mensaje se codifica con `encodeURIComponent()`.

```typescript
const mensaje = 'Hola, deseo hacer un pedido';
const url = `https://wa.me/57${telefono}?text=${encodeURIComponent(mensaje)}`;
```

---

# CASOS DE USO

## 1. Cliente hace pedido desde catálogo

```
Cliente arma carrito y hace clic en "Enviar pedido por WhatsApp"
  ↓
Backend genera URL wa.me con mensaje pre-llenado:
  - Saludo
  - Lista de productos
  - Total estimado
  - Datos del cliente
  - Dirección
  ↓
Cliente hace clic → WhatsApp se abre → mensaje listo para enviar
  ↓
Comercio recibe el mensaje y procesa el pedido manualmente
```

## 2. Notificación de cambio de estado de pedido

```
Backend genera URL wa.me según plantilla de notificación
  ↓
Se incluye en email al cliente
  ↓
Cliente hace clic → contacta al comercio
```

## 3. Botón flotante de WhatsApp en landing

```
Landing page muestra botón "Contactar por WhatsApp"
  ↓
Al hacer clic, abre wa.me con saludo pre-llenado
```

## 4. Compartir ubicación

```
Cliente comparte GPS del domicilio
  ↓
Genera link de Google Maps
  ↓
WhatsApp message incluye link
```

## 5. Cliente consulta estado de pedido

```
Pedido en estado X
  ↓
Botón "¿Consultar?" genera wa.me:
  "Hola, quiero consultar el estado de mi pedido #1234"
```

---

# PLANTILLAS DE MENSAJES

## Plantilla: hacer pedido

```
Hola {tenant.nombre} 👋

Deseo realizar el siguiente pedido:

{order.items}
- {item.nombre} x{item.cantidad} - ${item.subtotal}

*Total estimado:* ${order.total}

*Mis datos:*
Nombre: {customer.nombre}
Teléfono: {customer.telefono}
Dirección: {customer.direccion}
Ubicación: {customer.ubicacion_url}

Gracias.
```

Renderizado con `{{variables}}`.

## Plantilla: pedido confirmado

```
¡Hola {customer.nombre}! ✅

Tu pedido #{order.id} ha sido *confirmado*.

Total: ${order.total}
Domicilio: ${order.costoDomicilio}
Total a pagar: ${order.totalFinal}

Te avisaremos cuando esté en camino.

{tenant.nombre}
```

## Plantilla: pedido en camino

```
¡{customer.nombre}! 🛵

Tu pedido #{order.id} está *en camino*.

Domiciliario: {delivery.nombre}
Teléfono: {delivery.telefono}

Tiempo estimado: {delivery.tiempoEstimado} minutos.
```

## Plantilla: pedido entregado

```
¡{customer.nombre}! ✅

Tu pedido #{order.id} fue *entregado*.

Gracias por tu compra.

{tenant.nombre}
```

## Plantilla: cancelación

```
Hola {customer.nombre},

Tu pedido #{order.id} fue *cancelado*.

Motivo: {order.motivoCancelacion}

Si tienes preguntas, contáctanos.
```

---

# GENERACIÓN DE URL

```typescript
class WhatsAppService {
  generarLink(telefono: string, mensaje: string): string {
    // Limpiar número
    const telefonoLimpio = telefono.replace(/[^0-9]/g, '');
    // Codificar mensaje
    const mensajeEncoded = encodeURIComponent(mensaje);
    return `https://wa.me/${telefonoLimpio}?text=${mensajeEncoded}`;
  }

  generarLinkPedido(tenant: Tenant, order: Order, customer: Customer): string {
    const items = order.items
      .map((i) => `- ${i.nombre} x${i.cantidad} - $${formatMoney(i.subtotal)}`)
      .join('\n');

    const mensaje = `Hola ${tenant.nombre} 👋

Deseo realizar el siguiente pedido:

${items}

*Total estimado:* $${formatMoney(order.total)}

*Mis datos:*
Nombre: ${customer.nombre}
Teléfono: ${customer.telefono}
Dirección: ${customer.direccion}
Ubicación: ${customer.ubicacionUrl}

Gracias.`;

    return this.generarLink(tenant.whatsapp, mensaje);
  }
}
```

---

# INTEGRACIÓN EN FRONTEND

## Botón "Pedir por WhatsApp"

```tsx
<a
  href={whatsappLink}
  target="_blank"
  rel="noopener noreferrer"
  className="btn btn-success"
>
  <WhatsAppIcon /> Pedir por WhatsApp
</a>
```

## Botón flotante

```tsx
<a
  href={whatsappLink}
  target="_blank"
  rel="noopener noreferrer"
  className="whatsapp-fab"
>
  <WhatsAppIcon />
</a>
```

## QR en ticket

Generar QR de la URL wa.me para que el cliente lo escanee desde el ticket POS.

---

# LÍMITES DE MENSAJE

WhatsApp limita los mensajes a:

- 65.536 caracteres.
- Sin archivos adjuntos vía wa.me (solo texto).

Si el pedido es muy largo (muchos items), dividir en múltiples mensajes o sugerir llamar.

Para MVP con pedidos típicos, no se llega al límite.

---

# UBICACIÓN COMPARTIDA

El cliente puede compartir su ubicación en WhatsApp.

El backend genera un link de Google Maps para incluir en el mensaje:

```
https://www.google.com/maps?q={lat},{lng}
```

O un link corto wa.me con la ubicación pre-cargada en Google Maps.

---

# MÉTRICAS

- Clicks en botón WhatsApp por tenant.
- Conversión (pedido completado) vs clicks.
- Mensajes generados por tipo.

Detalle: [[REPORTES.md]].

---

# EVENTOS RELACIONADOS

- `whatsapp.link.generated`
- `whatsapp.link.clicked` (frontend emite)
- `whatsapp.message.sent` (estimado)

Detalle: [[EVENTOS.md]].

---

# AUDITORÍA

- `WHATSAPP_LINK_GENERATED`
- `WHATSAPP_CONFIG_UPDATED` (cambio de número)

Detalle: [[AUDITORIA.md]].

---

# MIGRACIÓN A WHATSAPP BUSINESS API (Fase 2)

## Plan

1. Registrar número comercial en Meta Business.
2. Verificar empresa.
3. Crear app en Meta for Developers.
4. Solicitar acceso a WhatsApp Business API.
5. Crear plantillas de mensajes (aprobadas por Meta).
6. Implementar interfaz `WhatsAppProvider` con dos implementaciones:
   - `WaMeDeepLinkProvider` (actual).
   - `CloudApiProvider` (nuevo, con Meta Cloud API).
7. Webhook para recibir mensajes entrantes.
8. Cola de envío con rate limit (80 msg/s por número, según Meta).
9. Manejo de costos (Meta cobra por conversación).

## Consideraciones

- Costo por mensaje (variable por país y tipo).
- Plantillas deben ser aprobadas antes de enviar mensajes iniciados por el negocio.
- Mensajes iniciados por el cliente (24h window) son gratis.
- Requiere mantener opt-in del cliente.

## Configuración

Variables de entorno nuevas:

```
WHATSAPP_PROVIDER=wa.me|cloud-api
WHATSAPP_PHONE_NUMBER_ID=<id>
WHATSAPP_BUSINESS_ACCOUNT_ID=<id>
WHATSAPP_ACCESS_TOKEN=<token>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<token>
```

---

# REGLAS CRÍTICAS

- El número siempre con código de país, sin caracteres especiales.
- Mensaje siempre URL-encoded.
- Link siempre `https://wa.me/` (no `api.whatsapp.com` que está deprecado).
- No incluir datos sensibles (tokens, contraseñas) en el mensaje.
- No abusar del envío (wa.me es solo para uso legítimo del cliente).
- Si el tenant no tiene WhatsApp configurado, ocultar botones relacionados.
- La generación del link es 100% frontend (no requiere API), pero el backend puede pre-generarlos para emails.
- En fase 2 con Cloud API, mantener opt-in explícito del cliente.
