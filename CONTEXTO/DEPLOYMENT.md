# DEPLOYMENT.md

# OBJETIVO

Definir el proceso de despliegue de Mocoa Market.

Alcance:

- Ambientes (dev, staging, prod).
- Pipeline de release.
- Estrategia de rollback.
- Configuración del servidor.
- DNS y SSL.
- Smoke tests post-deploy.

Detalle de CI/CD: [[CI_CD.md]].

Detalle de infraestructura: [[INFRAESTRUCTURA.md]].

---

# AMBIENTES

## Development (local)

- Docker Compose local.
- Código en branches `feature/*`, `fix/*`.
- Datos de prueba sembrados.
- Acceso solo a devs.

## Staging

- Réplica de producción en VPS separado o mismo VPS con DB separada.
- Branch `develop` o `staging`.
- Datos sintéticos (no producción).
- Usado para validación pre-prod.

## Production

- VPS Contabo principal.
- Branch `main`.
- Datos reales.
- Acceso restringido.

## Local-only testing

- Tests con SQLite en memoria o Postgres efímero.
- Sin afectar nada.

---

# ESTRUCTURA DE BRANCHES

```
main (protegida, requiere PR + review)
  ↑
  └── develop (staging)
        ↑
        ├── feature/*  (features nuevas)
        ├── fix/*      (bugfixes)
        ├── hotfix/*   (fixes urgentes desde main)
        └── chore/*    (tareas técnicas)
```

## Reglas

- `main` y `develop` protegidas.
- PR requiere al menos 1 aprobación.
- CI debe pasar (lint, tests, build).
- Squash merge a `main`.
- Conventional commits en mensajes.

---

# PIPELINE DE RELEASE

## Flujo

```
Feature branch → PR a develop → CI (lint + tests + build)
  ↓
Merge a develop → auto-deploy a staging
  ↓
Smoke tests manuales en staging
  ↓
PR de develop a main → CI + revisión
  ↓
Merge a main → auto-deploy a production
  ↓
Smoke tests automáticos en prod
  ↓
Notificación de release en Slack/Discord
```

## Hotfixes urgentes

```
main → hotfix branch → PR a main → CI
  ↓
Merge → auto-deploy a prod
  ↓
Cherry-pick a develop
```

---

# DEPLOY AUTOMÁTICO (CD)

## Implementación

GitHub Actions con SSH al VPS.

```yaml
- name: Deploy to production
  uses: appleboy/ssh-action@v1
  with:
    host: ${{ secrets.VPS_HOST }}
    username: deploy
    key: ${{ secrets.VPS_SSH_KEY }}
    script: |
      cd /app/mocoa-market
      git pull origin main
      docker compose pull
      docker compose up -d --build
      docker compose run --rm backend npx prisma migrate deploy
      docker system prune -f
```

## Backup pre-deploy

Antes de cada deploy:

```bash
./scripts/backup-pre-deploy.sh
```

Crea snapshot de DB y se guarda en `/var/backups/mocoastore/pre-deploy/`.

## Health check post-deploy

```yaml
- name: Health check
  run: |
    sleep 30
    response=$(curl -s -o /dev/null -w "%{http_code}" https://mocoastore.alexsters.works/health)
    if [ "$response" != "200" ]; then
      echo "Health check failed"
      exit 1
    fi
```

Si falla, ejecutar rollback.

---

# ROLLBACK

## Trigger

- Health check falla.
- Errores 5xx > 5% en 5 minutos.
- Reporte manual de incidente crítico.

## Procedimiento

```bash
cd /app/mocoa-market
git checkout HEAD~1  # o tag específico
docker compose pull
docker compose up -d --build
docker compose run --rm backend npx prisma migrate deploy
```

Si el problema es de DB, restaurar backup.

## Comunicación

- Notificar en canal de incidentes.
- Crear ticket post-mortem.
- Plan de fix.

---

# SERVIDOR DE PRODUCCIÓN

## Requisitos iniciales

- 1 VPS Contabo (4GB RAM, 80GB SSD).
- Ubuntu Server LTS (22.04+).
- Acceso SSH con clave pública.
- Usuario `deploy` con sudo limitado.

## Estructura de directorios

```
/app/
  mocoa-market/         # código clonado
    frontend/
    backend/
    infra/
  backups/              # backups automáticos
  logs/                 # logs centralizados
  scripts/              # scripts operativos
```

## Servicios

- Nginx (reverse proxy + SSL).
- Frontend (Next.js standalone).
- Backend (NestJS).
- PostgreSQL + PostGIS.
- Redis.
- MinIO.

Todos como contenedores Docker en red `mocoa-net`.

## Volúmenes persistentes

```
postgres_data
redis_data
minio_data
storage_data  # logos, imágenes, etc.
```

## Variables de entorno

Archivo `/app/mocoa-market/.env` con permisos `600` y owner `deploy`.

Nunca en git.

Detalle: [[eviroments.md]] y [[SEGURIDAD.md]].

---

# SSL/TLS

## Proveedor

Let's Encrypt (gratis).

## Herramienta

Certbot con Nginx plugin.

## Renovación

- Automática vía cron.
- Renovación 30 días antes del vencimiento.
- Test de renovación semanal.

```bash
0 0 * * 0 certbot renew --quiet --post-hook "systemctl reload nginx"
```

## HSTS

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

---

# DNS

## Registros

```
A     mocoastore.alexsters.works → IP_VPS
A     app.mocoastore.alexsters.works → IP_VPS
A     admin.mocoastore.alexsters.works → IP_VPS
CNAME www.mocoastore.alexsters.works → mocoastore.alexsters.works
```

## TTL

- 300s durante deploys.
- 3600s en operación normal.

## Wildcard (fase 2, multi-tenant con subdominios)

```
*.mocoastore.alexsters.works → IP_VPS
```

---

# NGINX

## Configuración base

```nginx
upstream backend {
  server backend:3000;
}

upstream frontend {
  server frontend:3000;
}

server {
  listen 80;
  server_name mocoastore.alexsters.works app.mocoastore.alexsters.works;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name mocoastore.alexsters.works;

  ssl_certificate /etc/letsencrypt/live/mocoastore.alexsters.works/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/mocoastore.alexsters.works/privkey.pem;

  # Frontend
  location / {
    proxy_pass http://frontend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # API
  location /api/ {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # WebSockets
  location /socket.io/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400s;
  }

  # Marketplace público
  location /negocio/ {
    proxy_pass http://frontend;
  }

  # Health
  location /health {
    proxy_pass http://backend;
  }
}
```

## Rate limit

```nginx
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
```

Aplicar en location de `/api/auth/login` y `/api/`.

## Compresión

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
gzip_min_length 1000;
```

---

# SMOKE TESTS

Post-deploy, ejecutar:

```bash
curl -f https://mocoastore.alexsters.works/health
curl -f https://mocoastore.alexsters.works/api/v1/public/businesses
curl -f https://mocoastore.alexsters.works/negocio/ejemplo
```

Si alguno falla, rollback automático.

## Tests funcionales críticos

Suite mínima:

- Login.
- Crear producto.
- Realizar venta.
- Confirmar pedido.
- Ver dashboard.

Automatizar con Playwright contra staging.

---

# ZERO DOWNTIME

## Estrategia

Rolling update con Docker.

```bash
docker compose up -d --no-deps --scale backend=2 backend
sleep 10
docker compose up -d --no-deps --scale backend=1 backend
```

(Requiere 2 réplicas temporales; no aplicable en MVP con 1 instancia).

## Aceptable para MVP

Mantenimiento breve (5-10s) durante deploy.

- Modo `nginx: "maintenance"` durante deploy.
- Página estática de "Actualizando".
- Auto-rollback si smoke test falla.

---

# DATABASE MIGRATIONS

## Aplicación

```bash
docker compose exec backend npx prisma migrate deploy
```

## Orden

1. Backup pre-deploy.
2. Pull código nuevo.
3. Aplicar migraciones.
4. Reiniciar backend.
5. Reiniciar frontend.
6. Health check.

## Migraciones breaking

- Coordinar con equipo.
- Plan de rollback claro.
- Aplicar en horario de bajo tráfico.
- Comunicar downtime.

---

# BLUE-GREEN (fase 2)

Para upgrade de DB o cambios breaking:

- Mantener 2 ambientes paralelos.
- Switch via DNS o Nginx upstream.
- Rollback instantáneo.

No necesario en MVP (costo operativo alto).

---

# DEPLOYMENT CHECKLIST

Antes de cada deploy a producción:

- [ ] Tests pasan en CI.
- [ ] Build de imágenes Docker exitoso.
- [ ] Backup pre-deploy ejecutado.
- [ ] Plan de rollback listo.
- [ ] Cambios en migraciones revisados.
- [ ] Variables de entorno actualizadas.
- [ ] Equipo notificado.
- [ ] Horario apropiado (no horas pico).
- [ ] Smoke tests definidos.

Post-deploy:

- [ ] Health check verde.
- [ ] Logs sin errores críticos.
- [ ] Métricas estables.
- [ ] Smoke tests pasaron.
- [ ] Equipo notificado del éxito.
- [ ] Ticket de release creado.

---

# EVENTOS RELACIONADOS

- `deploy.started`
- `deploy.completed`
- `deploy.failed`
- `deploy.rolled_back`

Detalle: [[EVENTOS.md]].

---

# REGLAS CRÍTICAS

- Nunca deployar a prod un viernes tarde.
- Nunca deployar sin backup previo.
- Nunca deployar sin health check.
- Nunca dejar migraciones sin probar en staging.
- Toda release lleva tag de versión (semver).
- Toda release tiene changelog.
- Rollback siempre listo y probado.
- Variables de entorno nunca en código.
- SSH al VPS solo con clave pública (no password).
