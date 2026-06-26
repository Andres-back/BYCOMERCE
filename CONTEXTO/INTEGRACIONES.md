# INTEGRACIONES.md

# OBJETIVO

Definir las integraciones externas de Mocoa Market.

Alcance:

- Catálogo de integraciones.
- Estrategia de abstracción.
- Configuración por integración.
- Proveedores de cada servicio.

Detalle de WhatsApp: [[WHATSAPP.md]].

Detalle de pagos: [[PAGOS.md]].

Detalle de notificaciones: [[NOTIFICACIONES.md]].

Detalle de geolocalización: [[GEOLOCALIZACION.md]].

---

# CATÁLOGO DE INTEGRACIONES

## MVP (inclusión)

| Servicio | Proveedor | Estado |
|----------|-----------|--------|
| Email transaccional | Resend | ✅ |
| WhatsApp | wa.me deep links | ✅ (sin API) |
| Mapas | OpenStreetMap + Leaflet | ✅ |
| SSL | Let's Encrypt | ✅ |
| DNS | Proveedor de dominio | ✅ |
| Backups remotos | Backblaze B2 (o Wasabi) | ✅ |
| Uptime monitoring | UptimeRobot | ✅ |
| Métricas | Prometheus + Grafana | ✅ |

| Asistente IA y vision | Groq Cloud + Ollama local | Implementado MVP, configurable por tenant |

## Fase 2 (post-MVP)

| Servicio | Proveedor candidato | Notas |
|----------|---------------------|-------|
| Pasarela de pagos | Wompi (principal), MercadoPago, PayU | Evaluar por fees y UX |
| WhatsApp Business API | Meta Cloud API | Costo por mensaje, plantillas |
| SMS | Twilio, ClickSend | Solo alertas críticas |
| Error tracking | Sentry | Alternativa a self-hosted |
| CDN | Cloudflare | Mitigación DDoS, cache global |
| Facturación electrónica | Proveedor DIAN | Requerido por ley |
| BI / Analytics | PostHog (self-hosted) o Mixpanel | Análisis de producto |
| Push notifications | Firebase Cloud Messaging | Para app móvil futura |

## Fase 3 (escala)

| Servicio | Proveedor candidato | Notas |
|----------|---------------------|-------|
| Orquestación | Kubernetes | Si el VPS cluster lo requiere |
| Message broker | NATS / Kafka | Si eventos crecen |
| Search engine | Meilisearch / Typesense | Búsqueda full-text |
| Object storage | S3, Wasabi | Si MinIO se queda corto |
| Email dedicado | Postmark / SES | Si volumen > 50K/mes |
| Logs centralizados | Loki / ELK | Si volumen lo requiere |

---

# ESTRATEGIA DE ABSTRACCIÓN

## Patrón Strategy

Cada integración detrás de una interfaz.

```typescript
// Interface
export interface IWhatsAppProvider {
  generarLink(telefono: string, mensaje: string): string;
  enviarMensaje(telefono: string, mensaje: string): Promise<void>;
  recibirMensajes(): Promise<MensajeEntrante[]>;  // fase 2
}

// Implementación MVP
export class WaMeDeepLinkProvider implements IWhatsAppProvider {
  generarLink(telefono: string, mensaje: string): string {
    return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
  }
  enviarMensaje(): Promise<void> { throw new Error('No soportado en MVP'); }
  recibirMensajes(): Promise<MensajeEntrante[]> { throw new Error('No soportado en MVP'); }
}

// Implementación Fase 2
export class CloudApiProvider implements IWhatsAppProvider {
  // Implementación con Meta Cloud API
}
```

## Módulo de integración

```typescript
@Module({
  providers: [
    {
      provide: 'WHATSAPP_PROVIDER',
      useClass: process.env.WHATSAPP_PROVIDER === 'cloud-api' 
        ? CloudApiProvider 
        : WaMeDeepLinkProvider,
    },
    WhatsAppService,
  ],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
```

## Beneficios

- Cambiar de proveedor sin modificar la lógica de negocio.
- Testear con mocks fácilmente.
- Soportar múltiples proveedores en paralelo (fase futura).
- Activar/desactivar integraciones por configuración.

---

# CONFIGURACIÓN

## IA por tenant

- Cada negocio puede activar/desactivar asistente IA y vision IA.
- `TenantAiSettings` guarda configuracion privada por tenant.
- Las API keys de Groq se guardan cifradas con `AI_SECRET_ENCRYPTION_KEY`.
- El frontend nunca recibe la clave real; solo recibe `hasGroqApiKey`.
- Vision soporta proveedor `OLLAMA` o `GROQ`.
- Groq usa endpoint OpenAI-compatible `https://api.groq.com/openai/v1/chat/completions`.
- Modelos por defecto:
  - Soporte: `llama-3.3-70b-versatile`.
  - Vision Groq: `meta-llama/llama-4-scout-17b-16e-instruct`.
  - Vision Ollama: `llava:latest`.

Variables:

```env
AI_SECRET_ENCRYPTION_KEY=
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
OLLAMA_URL=http://localhost:11434
OLLAMA_VISION_MODEL=llava:latest
```

## Variables de entorno por integración

```env
# Email
RESEND_API_KEY=
EMAIL_FROM=no-reply@mocoastore.alexsters.works
EMAIL_REPLY_TO=soporte@mocoastore.alexsters.works

# WhatsApp (fase 2)
WHATSAPP_PROVIDER=wa.me
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=

# Pagos (fase 2)
PAYMENT_GATEWAY_PROVIDER=wompi
WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_WEBHOOK_SECRET=

# SMS (fase 2)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Backups
S3_BACKUP_BUCKET=
S3_BACKUP_ENDPOINT=
S3_BACKUP_ACCESS_KEY=
S3_BACKUP_SECRET_KEY=

# Mapas
NEXT_PUBLIC_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
NEXT_PUBLIC_MAP_ATTRIBUTION=© OpenStreetMap contributors

# Monitoreo
GRAFANA_ADMIN_PASSWORD=
PROMETHEUS_RETENTION=30d
```

## Feature flags

```typescript
const config = {
  features: {
    whatsappCloudApi: env.WHATSAPP_PROVIDER === 'cloud-api',
    paymentGateway: !!env.PAYMENT_GATEWAY_PROVIDER,
    smsNotifications: !!env.SMS_PROVIDER,
    loyaltyProgram: env.LOYALTY_PROGRAM_ENABLED === 'true',
    multiBranch: env.MULTI_BRANCH_ENABLED === 'true',
  },
};
```

Permite activar funcionalidades por tenant o global sin redeploy.

---

# DESCRIPCIÓN DE INTEGRACIONES

## Resend (Email)

- Proveedor: Resend (https://resend.com).
- Costo: 3.000 emails/mes gratis, $20/mes para 50K.
- Setup: API key + dominio verificado.
- Uso: emails transaccionales (bienvenida, pagos, pedidos, etc).
- Documentación: https://resend.com/docs.

Configuración DNS:

```
TXT resend._domainkey.mocoastore.alexsters.works → (valor de Resend)
```

Detalle: [[NOTIFICACIONES.md]].

## OpenStreetMap + Leaflet (Mapas)

- Proveedor: OpenStreetMap Foundation.
- Costo: $0.
- Setup: ninguna (URL pública).
- Uso: mostrar mapas en landing, marketplace, panel de delivery.
- Librería: Leaflet (https://leafletjs.com).

Limitaciones:

- Tiles públicos: 1 carga por IP razonable.
- Para producción, considerar tile server propio o proveedor con CDN.

Alternativa fase 2: Mapbox (50K cargas/mes gratis).

Detalle: [[GEOLOCALIZACION.md]].

## Backblaze B2 (Backups remotos)

- Proveedor: Backblaze.
- Costo: $5/TB/mes, 10GB gratis.
- Setup: account + bucket + application key.
- Uso: backups diarios de DB y storage.
- Compatible con S3 SDK.

Detalle: [[BACKUPS.md]].

## Let's Encrypt (SSL)

- Proveedor: ISRG (gratis).
- Setup: certbot con plugin de Nginx.
- Uso: certificados SSL/TLS.
- Renovación: automática cada 60-90 días.

## UptimeRobot (Uptime)

- Proveedor: UptimeRobot.
- Costo: gratis 50 monitors, intervalos 5 min.
- Setup: account + agregar monitors.
- Uso: alerta si sitio caído.
- Canales: email, Telegram, SMS.

Detalle: [[MONITOREO.md]].

## Prometheus + Grafana (Métricas)

- Self-hosted.
- Costo: $0 (solo recursos del VPS).
- Setup: docker compose con imágenes oficiales.
- Uso: métricas, dashboards, alertas.

---

# FASE 2: PASARELA DE PAGOS

## Wompi (recomendado para Colombia)

- Wompi de Bancolombia.
- PSE, tarjetas crédito/débito, Nequi, Daviplata, Efecty, bancos.
- Fees: ~2.9% + $900 por transacción.
- Documentación: https://docs.wompi.co.

## MercadoPago

- Latam.
- Tarjetas, PSE, Efecty, bancos.
- Fees: 4.99% + fijo.
- Buena DX.

## PayU

- Latam.
- Similar a Wompi.
- Fees competitivos.

## Decisión a tomar en fase 2

Evaluar según:

- Fees por transacción.
- Métodos soportados.
- Facilidad de integración.
- Soporte local.
- SLA de payouts.

Detalle: [[PAGOS.md]].

---

# FASE 2: WHATSAPP BUSINESS API

## Meta Cloud API

- Oficial.
- Costo: variable por país y tipo de conversación.
- ~$0.01-0.05 USD por mensaje (varía).
- Plantillas deben ser aprobadas.
- Webhook para mensajes entrantes.
- Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api.

Detalle: [[WHATSAPP.md]].

---

# SEGURIDAD DE INTEGRACIONES

## Secretos

Todas las API keys en variables de entorno, nunca en código.

Rotación: cada 6 meses o ante incidente.

Documentado en [[SEGURIDAD.md]].

## Webhooks

- Validar firma del webhook (cada proveedor tiene su método).
- Rate limit en endpoint de webhook.
- Idempotencia con `Idempotency-Key`.
- Timeout corto, respuesta rápida.

## Validación de URLs

Si se用户提供 URLs (ej. webhook URL):

- Whitelist de dominios permitidos.
- Validar HTTPS.
- No permitir IPs internas.

## Rate limits de proveedores

- Email (Resend): 100/día gratis.
- WhatsApp Cloud: 80 msg/segundo.
- Pasarelas: variable.

Implementar cola con BullMQ para no exceder.

---

# MONITOREO DE INTEGRACIONES

- Health check de cada integración al inicio.
- Alerta si API externa devuelve 5xx repetidamente.
- Latencia de cada llamada.
- Tasa de error por proveedor.

Detalle: [[MONITOREO.md]].

---

# EVENTOS RELACIONADOS

- `integration.health.checked`
- `integration.failed`
- `integration.recovered`
- `webhook.received`
- `webhook.failed`

Detalle: [[EVENTOS.md]].

---

# AUDITORÍA

- Llamadas a APIs externas registran inicio y fin.
- Webhooks recibidos auditados.
- Cambios de configuración de integraciones auditados.

Detalle: [[AUDITORIA.md]].

---

# REGLAS CRÍTICAS

- Ninguna integración llama directo desde frontend.
- Ningún secreto en código.
- Ninguna llamada síncrona a API externa en request crítico.
- Toda respuesta de API externa validada (no confiar en shape).
- Webhooks SIEMPRE validan firma.
- Rate limits respetados.
- Timeouts configurados en todas las llamadas.
- Reintentos con backoff exponencial.
- Fallback graceful: si la integración falla, el sistema sigue funcionando.
