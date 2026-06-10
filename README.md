# Mocoa Market

Plataforma SaaS multi-tenant para comercios locales de Mocoa.

## Stack oficial

- Frontend: Next.js App Router
- Backend: NestJS
- ORM: Prisma
- DB: PostgreSQL + PostGIS
- Cache/colas: Redis
- Storage: MinIO
- Infra: Docker Compose + Nginx

La documentación fuente vive en `D:\DEV\TIENDA\CONTEXTO`.

## Desarrollo local

1. Copiar `.env.example` a `.env`.
2. Ajustar secretos locales.
3. Levantar servicios:

```bash
docker compose up -d postgres redis minio
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev:backend
npm run dev:frontend
```

## Endpoints iniciales

- `GET /health`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/public/businesses`
- `GET /api/v1/public/businesses/:slug`
- `GET /api/v1/public/businesses/:slug/products`
- `GET /api/v1/categories`
- `GET /api/v1/products`
- `POST /api/v1/orders`
- `GET /api/v1/orders`
- `POST /api/v1/orders/:id/confirm`
- `POST /api/v1/orders/:id/cancel`
- `GET /api/v1/sales`
- `POST /api/v1/sales`
