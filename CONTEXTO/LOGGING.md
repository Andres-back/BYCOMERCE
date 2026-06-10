# LOGGING.md

# OBJETIVO

Definir la estrategia de logging de Mocoa Market.

Alcance:

- Formato de logs.
- Niveles.
- Contexto.
- Almacenamiento.
- Rotación.
- Búsqueda.
- PII y seguridad.

Detalle de monitoreo: [[MONITOREO.md]].

Detalle de auditoría: [[AUDITORIA.md]].

---

# DECISIÓN ARQUITECTÓNICA

- Logs estructurados en **JSON**.
- Librería: **Pino** (Node.js) por performance.
- Almacenamiento: archivos en `/var/log/mocoastore/` con rotación.
- Agregación: opcional, **Loki** self-hosted o servicio externo.
- Retención: 30 días online, 6 meses en archivo.

Razones:

- JSON estructurado es fácil de parsear y buscar.
- Pino es de las librerías más rápidas.
- Sin servicio externo en MVP (costo $0).

---

# FORMATO

## Estructura JSON

```json
{
  "timestamp": "2026-06-05T12:34:56.789Z",
  "level": "INFO",
  "service": "backend",
  "module": "SalesService",
  "traceId": "req-abc-123",
  "tenantId": "tenant-uuid",
  "userId": "user-uuid",
  "message": "Sale created",
  "context": {
    "saleId": "sale-uuid",
    "total": 50000,
    "itemsCount": 3,
    "paymentMethod": "EFECTIVO"
  },
  "duration": 234,
  "error": null
}
```

## Campos estándar

| Campo | Descripción |
|-------|-------------|
| `timestamp` | ISO 8601 UTC |
| `level` | DEBUG, INFO, WARN, ERROR, FATAL |
| `service` | backend, frontend, worker, etc |
| `module` | NestJS module o componente |
| `traceId` | Request ID para correlación |
| `tenantId` | Tenant del contexto (si aplica) |
| `userId` | Usuario del contexto (si aplica) |
| `message` | Mensaje legible humano |
| `context` | Datos específicos del evento |
| `duration` | ms de la operación (si aplica) |
| `error` | Objeto Error (si aplica) |
| `stack` | Stack trace (solo ERROR/FATAL) |
| `ip` | IP del cliente (si aplica) |
| `userAgent` | User agent (si aplica) |

---

# NIVELES

## DEBUG

- Información detallada para desarrollo.
- Activado solo en development.
- Nunca en producción.

Ejemplos:

- Variables internas.
- Resultado de query con detalle.
- Decisiones de branching.

## INFO

- Eventos importantes del flujo normal.
- Produccíón: sí, con muestreo.

Ejemplos:

- Request completado.
- Venta creada.
- Login exitoso.
- Job completado.

## WARN

- Situaciones anómalas recuperables.
- Producción: sí, siempre.

Ejemplos:

- Retry de operación.
- Cache miss.
- Token próximo a expirar.
- Stock bajo.
- Validación fallida (input malformado).

## ERROR

- Errores recuperables pero importantes.
- Producción: sí, siempre.

Ejemplos:

- Excepción en service.
- Fallo de query.
- Timeout en API externa.
- Job fallido (después de reintentos).

## FATAL

- Errores irrecuperables que requieren intervención.
- Alerta inmediata.

Ejemplos:

- No se puede conectar a DB.
- Disco lleno.
- Configuración crítica faltante.

---

# CONFIGURACIÓN

## Backend (Pino)

```typescript
import { LoggerModule } from 'nestjs-pino';

LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' 
      ? { target: 'pino-pretty' }
      : undefined,
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
        userAgent: req.headers['user-agent'],
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
    customProps: (req) => ({
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    }),
  },
});
```

## Frontend (Next.js)

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.NEXT_PUBLIC_LOG_LEVEL || 'info',
  browser: {
    transmit: {
      level: 'info',
      send: async (logs) => {
        await fetch('/api/v1/logs/client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logs),
        });
      },
    },
  },
});
```

Backend recibe logs del cliente y los procesa.

## Workers (BullMQ)

Misma configuración Pino, sin HTTP context.

---

# CORRELACIÓN DE LOGS

## Trace ID

Generar al inicio de cada request:

```typescript
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
});
```

Propagar en:

- HTTP requests (header `X-Request-Id`).
- WebSocket messages.
- BullMQ jobs (campo `traceId` en data).
- Llamadas a APIs externas.

Beneficio: seguir una operación a través de múltiples servicios.

## Tenant ID

Extraer del JWT y agregar a todos los logs.

## User ID

Extraer del JWT.

---

# QUÉ SE LOGUEA

## HTTP

Cada request genera:

```json
{
  "level": "INFO",
  "method": "POST",
  "url": "/api/v1/sales",
  "statusCode": 201,
  "duration": 234,
  "tenantId": "...",
  "userId": "...",
  "ip": "1.2.3.4",
  "userAgent": "..."
}
```

Errores 5xx también loguean stack.

## Errores

```json
{
  "level": "ERROR",
  "message": "Failed to create sale",
  "error": {
    "name": "InsufficientStockException",
    "message": "No hay stock suficiente para Zapato Nike Talla 38",
    "code": "INSUFFICIENT_STOCK"
  },
  "stack": "Error: ...\n  at ...",
  "context": {
    "saleId": null,
    "productId": "...",
    "requested": 5,
    "available": 2
  }
}
```

## Eventos de dominio

Cada evento que se emite loguea:

```json
{
  "level": "INFO",
  "message": "Event emitted",
  "context": {
    "eventName": "venta.realizada",
    "eventId": "evt-uuid",
    "tenantId": "...",
    "payload": { ... }
  }
}
```

## Jobs de BullMQ

Inicio, éxito, fallo, retry.

---

# QUÉ NO SE LOGUEA (PII / Secretos)

NO incluir en logs:

- Contraseñas (ni hasheadas, idealmente).
- Tokens JWT completos.
- API keys.
- Datos de tarjetas (PCI DSS).
- Números de identificación personal.
- Información médica.
- Contenido completo de emails (solo metadata).
- Cookies de sesión.
- Códigos 2FA.
- Certificados o claves privadas.

Si se necesita loguear un objeto con PII, redactar:

```typescript
const redacted = {
  ...user,
  email: '***@***.com',
  phone: '***',
  password: undefined,
};
```

Helper `redactPII(obj)` en shared.

---

# ALMACENAMIENTO

## Local

```
/var/log/mocoastore/
  backend/
    app-2026-06-05.log       # rotación diaria
    error-2026-06-05.log     # solo errores
  frontend/
    app-2026-06-05.log
  workers/
    notifications-2026-06-05.log
    emails-2026-06-05.log
  nginx/
    access.log
    error.log
  postgres/
    postgresql-2026-06-05.log
  redis/
    redis.log
```

## Docker

Cada contenedor loguea a stdout/stderr.

Docker driver: `json-file` con rotación.

```yaml
services:
  backend:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
```

## Agregación con Loki (fase 2)

Opcional, para búsqueda centralizada:

```yaml
- name: loki
  image: grafana/loki:2.9.0
  ...
```

Promtail para enviar logs de Docker.

---

# ROTACIÓN

## Configuración logrotate

```bash
cat > /etc/logrotate.d/mocoastore <<EOF
/var/log/mocoastore/**/*.log {
  daily
  rotate 30
  compress
  delaycompress
  notifempty
  missingok
  create 0644 deploy deploy
  sharedscripts
  postrotate
    docker compose kill -s SIGUSR1 backend || true
  endscript
}
```

## Backblaze B2 (archivo)

Cada domingo, comprimir y subir logs antiguos:

```bash
#!/bin/bash
# /app/scripts/archive-logs.sh

find /var/log/mocoastore -name "*.log-*.gz" -mtime +30 -exec gzip {} \;
aws s3 sync /var/log/mocoastore/ s3://mocoa-archive-logs/$(date +%Y/%m)/
```

Retención en archivo: 6 meses.

---

# BÚSQUEDA

## Comando básico (jq + grep)

```bash
# Últimos errores del backend
tail -f /var/log/mocoastore/backend/app.log | jq 'select(.level=="ERROR")'

# Todas las requests de un tenant
cat /var/log/mocoastore/backend/app-2026-06-05.log | jq 'select(.tenantId=="tenant-123")'

# Latencia p95 de un endpoint
cat /var/log/mocoastore/backend/app-2026-06-05.log | jq 'select(.url=="/api/v1/sales") | .duration' | sort -n
```

## Con Loki + Grafana (fase 2)

```logql
{app="backend"} | json | level="ERROR"
```

UI de Grafana con autocompletado.

## Con Elasticsearch (fase 2, si Loki no alcanza)

Logstash + Elasticsearch + Kibana.

Más poderoso pero más complejo.

---

# CORRELACIÓN CON AUDITORÍA

Logs y `AUDIT_LOGS` son complementarios:

- `AUDIT_LOGS`: eventos de negocio, persistidos, consultables por usuario.
- Logs: eventos técnicos, rotativos, consultables por developer.

Para acciones críticas:

1. Log técnico: nivel INFO con stack.
2. Audit log: registro en DB.

Mismo `traceId` en ambos para correlación.

---

# NIVELES POR AMBIENTE

## Development

- `LOG_LEVEL=debug`
- Pretty printing habilitado
- Sin redacción (datos sintéticos)
- Stack completo en errores

## Staging

- `LOG_LEVEL=info`
- JSON estructurado
- Redacción activa
- Stack en errores

## Production

- `LOG_LEVEL=info`
- JSON estructurado
- Redacción activa
- Sin stack en respuestas HTTP (sí en logs internos)
- Sampling opcional para reducir volumen

---

# LOGS DE TERCEROS

## Next.js

Logs de SSR y client enviados al endpoint del backend.

## Workers BullMQ

Logs propios + logs del job.

## Bull Board

Acceso visual a jobs fallidos con su log.

## Nginx

Access log formato combinado:

```nginx
log_format combined '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'rt=$request_time '
                    'ua="$http_user_agent"';
```

---

# MÉTRICAS DERIVADAS

De los logs se calculan:

- Errores 5xx por minuto (Promtail → Loki → PromQL).
- Latencia p95 por endpoint.
- Endpoints más lentos.
- Usuarios más activos.
- IPs con más errores.

Se grafican en Grafana.

Detalle: [[MONITOREO.md]].

---

# EVENTOS RELACIONADOS

- `log.emitted` (interno, no se emite a otros sistemas)

Detalle: [[EVENTOS.md]].

---

# AUDITORÍA

Los logs no se auditan (son solo técnicos).

Pero las acciones de:

- Cambiar `LOG_LEVEL`
- Acceder a archivos de log
- Eliminar logs manualmente

Sí se auditan en `AUDIT_LOGS`.

Detalle: [[AUDITORIA.md]].

---

# REGLAS CRÍTICAS

- Todos los logs en JSON estructurado.
- Nivel INFO mínimo en producción.
- PII siempre redactado.
- Stack trace solo en logs internos (nunca en respuesta HTTP).
- Rotación diaria automática.
- Retención 30 días online + 6 meses archivo.
- Trace ID propagado en toda la cadena.
- Logs de error y acceso separados.
- Sin secrets en logs (verificar con `grep`).
- Logs nunca se eliminan manualmente (rotación automática).
