# CI_CD.md

# OBJETIVO

Definir los pipelines de integración continua y despliegue continuo de Mocoa Market.

Alcance:

- Plataforma: GitHub Actions.
- Workflows por branch.
- Tests automatizados.
- Build de imágenes.
- Deploy a staging y producción.
- Secrets y variables.

Detalle de deploy: [[DEPLOYMENT.md]].

Detalle de testing: [[TESTING.md]].

---

# DECISIÓN ARQUITECTÓNICA

Plataforma: **GitHub Actions**.

Razones:

- Integración nativa con el repo.
- 2.000 minutos/mes gratis (suficiente para MVP).
- Secrets cifrados incluidos.
- Matriz de tests fácil.
- Comunidad enorme (muchas Actions reutilizables).

Alternativas consideradas:

- GitLab CI: requiere GitLab.
- CircleCI: costo desde el inicio.

---

# WORKFLOWS

## 1. CI por PR (pull_request.yml)

Trigger: cada push a PR abierto contra `develop` o `main`.

Jobs:

1. **lint**: ESLint + Prettier check.
2. **typecheck**: TypeScript compile.
3. **test-backend**: Unit tests + integration tests del backend.
4. **test-frontend**: Build + tests del frontend.
5. **build-images**: Construir imágenes Docker (sin push).
6. **security-scan**: npm audit + trivy sobre imágenes.

Status check required para merge.

## 2. CD a staging (deploy-staging.yml)

Trigger: push a `develop`.

Jobs:

1. **build-images**: Construir + pushear imágenes a registry.
2. **deploy-staging**: SSH al VPS staging + docker compose pull + restart.
3. **smoke-staging**: Ejecutar smoke tests.
4. **notify**: Notificar éxito/fallo.

## 3. CD a producción (deploy-production.yml)

Trigger: push a `main` (post-merge de PR).

Jobs:

1. **build-images**: Mismo que staging pero con tags de versión.
2. **backup-pre-deploy**: Ejecutar backup en VPS.
3. **deploy-production**: SSH al VPS prod + pull + restart.
4. **migrate**: Aplicar migraciones Prisma.
5. **smoke-production**: Smoke tests críticos.
6. **rollback-if-failed**: Si falla, ejecutar rollback automático.
7. **notify**: Notificar.

## 4. Cron jobs (cron.yml)

Trigger: schedule.

Jobs:

- **db-cleanup**: Limpiar audit logs antiguos.
- **dep-update**: Dependabot semanal.
- **backup-verify**: Verificar integridad de backups.

---

# EJEMPLO DE WORKFLOW

## CI por PR

```yaml
name: CI

on:
  pull_request:
    branches: [develop, main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:15-3.4
        env:
          POSTGRES_DB: test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: cd backend && npx prisma migrate deploy
      - run: cd backend && npm run test
      - run: cd backend && npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results
          path: backend/test-results/

  build-images:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t mocoa-backend:ci-${{ github.sha }} ./backend
      - run: docker build -t mocoa-frontend:ci-${{ github.sha }} ./frontend
```

## CD a producción

```yaml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ghcr.io/mocoamarket/backend:${{ github.sha }}
      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ghcr.io/mocoamarket/frontend:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Backup pre-deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: deploy
          key: ${{ secrets.VPS_SSH_KEY }}
          script: /app/scripts/backup-pre-deploy.sh

      - name: Deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: deploy
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /app/mocoa-market
            export IMAGE_TAG=${{ github.sha }}
            docker compose pull
            docker compose up -d
            docker compose exec -T backend npx prisma migrate deploy

      - name: Smoke tests
        run: |
          sleep 30
          for url in https://mocoastore.alexsters.works/health \
                     https://mocoastore.alexsters.works/api/v1/public/businesses; do
            code=$(curl -s -o /dev/null -w "%{http_code}" $url)
            if [ "$code" != "200" ]; then
              echo "Smoke failed: $url returned $code"
              exit 1
            fi
          done

      - name: Rollback on failure
        if: failure()
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: deploy
          key: ${{ secrets.VPS_SSH_KEY }}
          script: /app/scripts/rollback.sh
```

---

# SECRETS

Almacenados en GitHub Secrets (cifrados).

| Secret | Uso |
|--------|-----|
| `VPS_HOST` | IP o dominio del VPS |
| `VPS_SSH_KEY` | Clave privada SSH |
| `VPS_USER` | Usuario SSH (deploy) |
| `DATABASE_URL` | URL de prod (para migraciones) |
| `JWT_ACCESS_SECRET` | Secret de JWT |
| `JWT_REFRESH_SECRET` | Secret de refresh |
| `RESEND_API_KEY` | API key de Resend |
| `GITHUB_TOKEN` | Auto-generado para ghcr.io |

## Acceso

Solo workflows autorizados pueden usar secrets.

Para debugging local, usar `.env.example` con placeholders.

---

# CONTAINER REGISTRY

Usar **GitHub Container Registry** (ghcr.io).

Razones:

- Incluido gratis con GitHub.
- Integrado con GITHUB_TOKEN.
- Privado por default en orgs.

Tags:

- `latest` (build de main).
- `<sha>` (cada build).
- `vX.Y.Z` (tags de release).

---

# MATRIZ DE TESTS

## Backend

- `npm run test`: unit + integration con coverage.
- `npm run test:e2e`: end-to-end de flujos críticos.
- `npm run test:watch`: en desarrollo.

## Frontend

- `npm run test`: unit (jest).
- `npm run test:e2e`: e2e con Playwright.
- `npm run typecheck`: TypeScript check.

Detalle: [[TESTING.md]].

---

# CACHÉ DE DEPENDENCIAS

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```

Cache de npm por `package-lock.json`.

Para Docker, usar `cache-from: type=gha` en build-push-action.

---

# CACHÉ DE BUILD

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      backend/.next
      frontend/.next
    key: ${{ runner.os }}-build-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-build-
```

---

# NOTIFICACIONES

## Slack / Discord

```yaml
- name: Notify success
  if: success()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Deploy producción exitoso: ${{ github.sha }}'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## Email

A través de Resend o SMTP para alertas críticas.

---

# ARTIFACTS

Generados en CI:

- Reporte de coverage (lcov).
- Reporte de tests (junit XML).
- Imágenes Docker (con tag).
- Reporte de seguridad.

Subidos como artifacts descargables (últimos 7 días).

---

# BRANCH PROTECTION RULES

Configurar en GitHub:

- `main`: requiere 1 review, CI verde, sin commits directos.
- `develop`: requiere CI verde, sin commits directos.
- Squash merge obligatorio.
- Borrar branches después de merge.

---

# VERSIONADO

SemVer: `MAJOR.MINOR.PATCH`.

- `MAJOR`: cambios breaking (API, modelo de datos).
- `MINOR`: features nuevas.
- `PATCH`: bugfixes.

Tag automático en merge a main (GitHub Action).

Changelog autogenerado desde conventional commits.

---

# BADGES

En el README del repo:

- Estado de CI.
- Coverage %.
- Versión actual.
- Licencia.

---

# EVENTOS RELACIONADOS

- `ci.started`
- `ci.passed`
- `ci.failed`
- `deploy.started`
- `deploy.completed`
- `deploy.failed`
- `deploy.rolled_back`

Detalle: [[EVENTOS.md]].

---

# REGLAS CRÍTICAS

- Toda PR debe pasar CI antes de merge.
- Todo deploy a prod viene de main, nunca de develop directo.
- Secrets nunca en código ni en logs.
- Imágenes Docker con tag específico (nunca `latest` en prod).
- Migraciones probadas en staging antes de prod.
- Health check post-deploy es OBLIGATORIO.
- Rollback automático si smoke test falla.
- Workflows deben ser idempotentes.
- Las GitHub Actions se mantienen actualizadas (Dependabot).
