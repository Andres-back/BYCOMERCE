# MONITOREO.md

# OBJETIVO

Definir la estrategia de monitoreo de Mocoa Market.

Alcance:

- Métricas de infraestructura.
- Métricas de aplicación.
- Uptime.
- Alertas.
- Dashboards.
- Health checks.

Detalle de logging: [[LOGGING.md]].

Detalle de deployment: [[DEPLOYMENT.md]].

---

# DECISIÓN ARQUITECTÓNICA

Stack:

- **UptimeRobot** (externo, gratis 50 checks) para uptime público.
- **Prometheus** self-hosted para métricas.
- **Grafana** self-hosted para dashboards.
- **Alertmanager** para alertas.
- **Node Exporter** para métricas del VPS.

Razones:

- Costo $0 para MVP.
- Stack estándar, bien documentado.
- Suficiente para los primeros 1.000 tenants.

Fase 2: migrar a Sentry self-hosted si necesitan session replay, o evaluar Highlight.io.

**Para errores de frontend:** GlitchTip 6 self-host (Docker, 4 contenedores, 256-512 MB RAM). Mismo SDK que Sentry (`@sentry/nextjs`), swap de DSN cuando migren. Ver [[FRONTEND_STACK.md]] sección 4.

---

# MÉTRICAS DE INFRAESTRUCTURA

## VPS (Node Exporter)

- CPU usage (%)
- Memory usage (bytes, %)
- Disk usage (bytes, %, inodes)
- Network in/out (bytes/s)
- Load average
- Process count
- Open file descriptors

## Docker (cAdvisor)

- Container CPU usage
- Container memory usage
- Container network I/O
- Container disk I/O
- Container restart count

## PostgreSQL (postgres_exporter)

- Connections (active, idle, max)
- Transactions per second
- Locks count
- Replication lag
- Cache hit ratio
- Index usage
- Slow queries

## Redis (redis_exporter)

- Connected clients
- Used memory
- Hit/Miss ratio
- Evicted keys
- Commands per second

## MinIO

- Storage used
- Total objects
- API requests
- Errors

---

# MÉTRICAS DE APLICACIÓN

## Backend (NestJS)

Custom metrics con `prom-client`:

- `http_requests_total{method, route, status}` (counter)
- `http_request_duration_seconds{method, route}` (histogram)
- `http_requests_in_flight` (gauge)
- `db_query_duration_seconds{operation, model}` (histogram)
- `cache_hits_total{key_prefix}` (counter)
- `cache_misses_total{key_prefix}` (counter)
- `auth_login_attempts_total{result}` (counter)
- `auth_login_failures_total{reason}` (counter)
- `sales_total{tenant_id}` (counter)
- `orders_total{tenant_id, status}` (counter)
- `events_emitted_total{event_name}` (counter)
- `events_failed_total{event_name, queue}` (counter)
- `jobs_processed_total{queue, status}` (counter)

## BullMQ

- `bullmq_jobs_completed_total{queue}`
- `bullmq_jobs_failed_total{queue}`
- `bullmq_jobs_active{queue}`
- `bullmq_jobs_waiting{queue}`
- `bullmq_jobs_delayed{queue}`

## WebSockets

- `ws_connections_active` (gauge)
- `ws_messages_in_total{event}` (counter)
- `ws_messages_out_total{event}` (counter)
- `ws_connection_duration_seconds` (histogram)

## Negocio

- Tenants activos.
- Suscripciones por estado.
- MRR (calculado desde job nocturno).
- Pedidos por hora.
- Ventas por hora.

---

# UPTIME MONITORING

## UptimeRobot

Checks cada 5 minutos:

- `https://mocoastore.alexsters.works/` → debe retornar 200.
- `https://mocoastore.alexsters.works/api/v1/public/businesses` → debe retornar 200.
- `https://mocoastore.alexsters.works/health` → debe retornar 200.

Alertas por email si falla.

Plan gratis: 50 checks, intervalos de 5 min.

## Health check de aplicación

```typescript
// Backend /health
@Get('health')
async health() {
  const checks = {
    db: await this.prisma.$queryRaw`SELECT 1`.then(() => 'ok').catch(() => 'down'),
    redis: await this.redis.ping().then(() => 'ok').catch(() => 'down'),
    minio: await this.minio.listBuckets().then(() => 'ok').catch(() => 'down'),
  };
  
  const allOk = Object.values(checks).every(v => v === 'ok');
  return { status: allOk ? 'ok' : 'degraded', checks };
}
```

Status 200 si todo OK, 503 si algo falla.

Usado por:

- UptimeRobot.
- Docker healthcheck.
- Nginx upstream check.

---

# LOGGING (referencia)

Fuente: [[LOGGING.md]].

Métricas derivadas de logs:

- Errores 5xx por minuto.
- Warnings por minuto.
- Latencia p95/p99.

---

# ALERTAS

## Configuración (Alertmanager)

```yaml
groups:
- name: mocoa-market
  rules:
  - alert: ServiceDown
    expr: up == 0
    for: 2m
    annotations:
      summary: "Service {{ $labels.instance }} is down"
  
  - alert: HighCPU
    expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
    for: 10m
    annotations:
      summary: "CPU > 80% on {{ $labels.instance }}"
  
  - alert: HighMemory
    expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
    for: 10m
    annotations:
      summary: "Memory > 85% on {{ $labels.instance }}"
  
  - alert: DiskSpaceLow
    expr: (1 - (node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes)) * 100 > 80
    for: 30m
    annotations:
      summary: "Disk > 80% on {{ $labels.instance }}"
  
  - alert: HighErrorRate
    expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
    for: 5m
    annotations:
      summary: "Error rate > 5%"
  
  - alert: HighLatency
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 10m
    annotations:
      summary: "p95 latency > 2s"
  
  - alert: DatabaseConnectionsHigh
    expr: pg_stat_activity_count > 80
    for: 5m
    annotations:
      summary: "DB connections > 80"
  
  - alert: BackupFailed
    expr: backup_last_success_timestamp < time() - 86400
    for: 1h
    annotations:
      summary: "No successful backup in 24h"
```

## Canales de notificación

### Email

Para alertas no críticas.

Configurar SMTP de Resend o Gmail.

### Telegram (recomendado)

Bot de Telegram para alertas inmediatas.

```yaml
receivers:
- name: telegram
  webhook_configs:
  - url: 'https://api.telegram.org/bot<TOKEN>/sendMessage'
    send_resolved: true
```

### SMS (opcional, fase 2)

Solo para incidentes críticos fuera de horario.

## Severidad

| Severidad | Canal | Tiempo de respuesta |
|-----------|-------|---------------------|
| CRITICAL | Telegram + SMS | Inmediato |
| HIGH | Telegram + email | 1 hora |
| MEDIUM | Email | 4 horas |
| LOW | Email (digest diario) | 24 horas |

---

# DASHBOARDS

## Dashboard: Infraestructura (Grafana)

- CPU por core.
- RAM usage.
- Disco por partición.
- Network I/O.
- Load average.
- Docker containers status.
- Postgres connections.
- Redis memory.

## Dashboard: Aplicación

- Request rate por endpoint.
- Latencia p50, p95, p99.
- Error rate.
- Cache hit ratio.
- Top endpoints por tráfico.
- Top errores.

## Dashboard: Negocio

- Tenants activos (últimos 30 días).
- Suscripciones por plan.
- MRR.
- Churn.
- Ventas por día.
- Pedidos por estado.
- Usuarios activos.

## Dashboard: Negocio por tenant (interno)

- Ventas por tenant.
- Productos más vendidos.
- Pedidos pendientes.
- Caja actual.

Acceso restringido a SUPER_ADMIN.

---

# DASHBOARDS PARA EL COMERCIO

Cada ADMIN_NEGOCIO ve en su panel:

- Ventas del día (KPI card).
- Ventas del mes.
- Pedidos activos.
- Productos agotados.
- Gráfica de ventas (7 días).
- Caja actual.

Esto se renderiza desde la app Next.js, consultando la API.

Para los reportes completos, ver [[REPORTES.md]].

---

# RETENCIÓN DE MÉTRICAS

| Tipo | Retención |
|------|-----------|
| Raw (15s) | 7 días |
| 5m rollup | 30 días |
| 1h rollup | 90 días |
| 1d rollup | 2 años |

Configurado en Prometheus con `--storage.tsdb.retention.time` y downsampling.

---

# HERRAMIENTAS COMPLEMENTARIAS

## Bull Board

UI para inspeccionar jobs de BullMQ.

Disponible solo en red interna o autenticado.

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
```

## Prisma Studio

Para inspección manual de DB (solo desarrollo y soporte crítico).

## pgAdmin

Acceso a Postgres vía pgAdmin (desarrollo y SUPER_ADMIN).

---

# MONITOREO DE INTEGRACIONES

- Resend: dashboard de Resend + alertas de bounce.
- UptimeRobot: histórico de uptime.
- Backups: cron verificador.

---

# INCIDENTES

## Runbook básico

| Alerta | Acción |
|--------|--------|
| ServiceDown | SSH al VPS, ver `docker ps`, ver logs, reiniciar servicio. |
| HighCPU | Ver procesos con `top`, ver logs de aplicación. |
| DiskSpaceLow | Limpiar logs, backups antiguos, `docker system prune`. |
| HighErrorRate | Ver logs de error, identificar endpoint problemático, posible rollback. |
| DBConnectionsHigh | Identificar queries lentas, reiniciar app pool. |
| BackupFailed | Revisar logs del script, ejecutar backup manual. |

## Post-incidente

1. Documentar en ticket.
2. Root cause analysis.
3. Plan de prevención.
4. Implementar mejora.

---

# EVENTOS RELACIONADOS

- `alert.fired`
- `alert.resolved`
- `health.degraded`
- `health.recovered`
- `incident.detected`
- `incident.resolved`

Detalle: [[EVENTOS.md]].

---

# REGLAS CRÍTICAS

- Health check siempre responde (incluso en degraded).
- Alertas probadas mensualmente.
- Dashboards revisados semanalmente.
- Métricas de negocio críticas en dashboard ejecutivo.
- Alertas críticas en Telegram (inmediato).
- Runbooks documentados y actualizados.
- Retención de métricas suficiente para análisis trimestral.
- Post-mortem obligatorio tras incidente crítico.
