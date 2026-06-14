# SEGURIDAD.md

# REVISION 2026-06-14 - HARDENING CRITICO MVP

## Cambios aplicados

- Uploads:
  - allowlist de `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
  - validacion de magic bytes para que el contenido coincida con el mimetype declarado.
  - nombres aleatorios y extension controlada por servidor.
  - PDF servido como attachment.
- Infra:
  - Docker usa `npm ci` y contexto monorepo controlado.
  - `docker-compose.yml` exige secretos reales para Postgres, MinIO y `AI_SECRET_ENCRYPTION_KEY`.
  - Nginx agrega headers base: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
  - `client_max_body_size 16m` alineado con limite de uploads.
- Frontend:
  - removidos logs de debug de WebSocket.
  - corregida fuga de listeners socket.
  - formatos de fecha toleran datos ausentes para evitar crashes y exposicion de errores.
- Dependencias:
  - actualizaciones patch/minor aplicadas en Next, React, Tailwind, Nest, AWS SDK, Helmet, `tsx` y tooling Nest.
  - `npm audit fix` normal aplicado sin `--force`.

## Riesgos pendientes

- Autenticacion: access/refresh token siguen en `localStorage`. Riesgo alto ante XSS. Pendiente fase auth profunda con refresh token en cookie HttpOnly, rotacion y CSRF/Origin checks si se habilitan cookies.
- `npm audit` residual: PostCSS moderado via Next. No se aplico `npm audit fix --force` porque propone downgrade destructivo a Next 9.3.3.
- CSP estricta: Nginx tiene headers base, pero falta politica CSP iterativa en report-only antes de enforcement.
- Rate limiting: no se implemento throttling app/edge para login y endpoints costosos en esta fase.

---

# OBJETIVO

Definir la estrategia de seguridad integral de Mocoa Market.

Alcance:

- Seguridad perimetral.
- Seguridad de transporte.
- Seguridad de aplicación.
- Seguridad de datos.
- Seguridad operativa.
- Cumplimiento.

Detalle de auth: [[AUTH.md]].

Detalle de RBAC: [[RBAC.md]].

Detalle de auditoría: [[AUDITORIA.md]].

Detalle de backups: [[BACKUPS.md]].

---

# PRINCIPIOS

1. **Defense in depth**: múltiples capas de seguridad.
2. **Least privilege**: cada actor solo accede a lo mínimo necesario.
3. **Zero trust**: nunca confiar en inputs del cliente.
4. **Fail secure**: ante error, denegar acceso.
5. **Audit everything**: toda acción crítica queda registrada.
6. **Secure by default**: configuración segura por defecto.

---

# SEGURIDAD PERIMETRAL

## Firewall (UFW)

```bash
# Default
ufw default deny incoming
ufw default allow outgoing

# SSH
ufw allow 22/tcp

# HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Monitoreo interno (solo desde IP admin)
# ufw allow from YOUR_IP to any port 9090

ufw enable
```

## Fail2Ban

```bash
apt install fail2ban

cat > /etc/fail2ban/jail.local <<EOF
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 3600

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6
bantime = 3600
EOF

systemctl restart fail2ban
```

## Puertos expuestos

Solo 22, 80, 443.

Postgres, Redis, MinIO: solo en red Docker interna (NO exponer al exterior).

## Actualizaciones

```bash
# Actualizaciones de seguridad automáticas
apt install unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

Cron semanal para verificar.

---

# SEGURIDAD DE TRANSPORTE

## SSL/TLS

- HTTPS obligatorio en producción.
- Let's Encrypt con renovación automática.
- HSTS habilitado (1 año, includeSubDomains).
- TLS 1.2 mínimo, TLS 1.3 preferido.

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
```

## Certificados

```bash
certbot --nginx -d mocoastore.alexsters.works
```

Renovación automática vía cron.

Detalle: [[DEPLOYMENT.md]].

## CORS

```typescript
// Backend
app.enableCors({
  origin: [
    'https://mocoastore.alexsters.works',
    'https://app.mocoastore.alexsters.works',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'Idempotency-Key'],
});
```

Solo orígenes permitidos.

---

# SEGURIDAD DE APLICACIÓN

## Headers HTTP (Helmet)

```typescript
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.openstreetmap.org'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
}));
```

## Validación de entrada

- Toda entrada validada con `class-validator` en el backend.
- Sanitización contra XSS, SQL injection, command injection.
- DTOs estrictos (no `any`).
- Validación de tipos y rangos.

## Rate Limiting

```typescript
import { ThrottlerModule } from '@nestjs/throttler';

ThrottlerModule.forRoot([{
  name: 'short',
  ttl: 1000,
  limit: 3,
}, {
  name: 'medium',
  ttl: 10000,
  limit: 20,
}, {
  name: 'long',
  ttl: 60000,
  limit: 100,
}]);
```

Aplicar a endpoints sensibles.

Detalle: [[API.md]].

## CSRF

- APIs stateless con JWT en header: no vulnerables a CSRF tradicional.
- Cookies de sesión: usar CSRF token.

## Inyección SQL

- Solo Prisma (no SQL crudo).
- Si SQL crudo necesario, usar parámetros.

## XSS

- React escapa por defecto.
- No usar `dangerouslySetInnerHTML` sin sanitizar.
- CSP estricto (ver Helmet).

## Subida de archivos

- Validar MIME type real (no confiar en extensión).
- Validar tamaño máximo.
- Generar nombre único (no用户提供).
- Almacenar fuera del webroot.
- URLs prefirmadas con expiración corta.

---

# SEGURIDAD DE DATOS

## Hashing de contraseñas

- bcrypt con cost >= 12.
- No loguear contraseñas hasheadas.
- Política de contraseñas fuertes (validar en backend).

```typescript
import * as bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12);
const match = await bcrypt.compare(password, hash);
```

## Datos personales

- Cumplir Ley 1581/2012 (Colombia).
- Derecho de acceso, rectificación, eliminación.
- Solo almacenar lo necesario.
- Cifrar datos sensibles en reposo (fase 2).
- Logs no incluyen PII.

## Datos en tránsito

- HTTPS para todo.
- TLS 1.2+ para SMTP, DB connections.
- Redis sobre TLS (fase 2).

## Datos en reposo

- DB cifrada en disco (LUKS en VPS, fase 2).
- Backups cifrados (ver [[BACKUPS.md]]).
- Variables de entorno con secretos.

## Multi-tenant

- Filtro `tenant_id` obligatorio en toda query.
- Prisma middleware.
- Tests de aislamiento.

Detalle: [[MULTI_TENANT.md]].

---

# SEGURIDAD DE DEPENDENCIAS

## npm audit

```bash
npm audit --production
```

En CI, fallar si hay vulnerabilidades altas o críticas.

## Renovación

- Dependabot semanal.
- Renovación de majors manual con tests.

## Lockfile

- `package-lock.json` versionado.
- `npm ci` en CI, no `npm install`.

## Snyk (opcional)

Para análisis más profundo de vulnerabilidades.

## Trivy (imágenes Docker)

```bash
trivy image mocoa-backend:latest
```

En CI.

---

# SECRETOS

## Gestión

- Variables de entorno en `.env` (nunca en código).
- `.env` en `.gitignore`.
- `.env.example` con placeholders en repo.
- En VPS: archivo con permisos 600, owner deploy.

## Rotación

- Secretos de JWT: rotar cada 6 meses o ante incidente.
- Clave SSH: rotar anualmente.
- API keys externas: según política del proveedor.
- Procedimiento documentado en [[DEPLOYMENT.md]].

## Lista de secretos

| Secret | Uso | Rotación |
|--------|-----|----------|
| JWT_ACCESS_SECRET | Firma de access tokens | 6 meses |
| JWT_REFRESH_SECRET | Firma de refresh tokens | 6 meses |
| DB passwords | Postgres | 6 meses |
| Redis password | Redis auth | 6 meses |
| MinIO access/secret | MinIO | 6 meses |
| Resend API key | Email | anual |
| SSH private key | Deploy | anual |
| GitHub token | CI/CD | según GH |
| S3 backup keys | Backups | 6 meses |

---

# PROTECCIÓN CONTRA ATAQUES COMUNES

## Brute force

- Rate limit en login.
- Bloqueo tras 5 intentos fallidos.
- Fail2Ban para SSH.

## DDoS

- Cloudflare (fase 2) para CDN y mitigación.
- Rate limit en Nginx.
- Conexiones máximas por IP.

## SQL injection

- Prisma exclusivamente.
- Validación con class-validator.

## XSS

- React escapa por defecto.
- CSP estricto.
- Sanitización de HTML en emails.

## CSRF

- JWT en header (no cookies por defecto en API).
- SameSite=strict en cookies.

## Path traversal

- Validar rutas en upload.
- Servir solo archivos conocidos.

## Mass assignment

- DTOs explícitos.
- No pasar `req.body` directo al service.

## Information disclosure

- Mensajes de error genéricos en producción.
- No stack traces en respuestas.
- No versiones en headers.

## SSRF

- No fetch a URLs用户提供 sin validación.
- Whitelist de hosts permitidos.

---

# AUDITORÍA

Todo evento de seguridad queda en `AUDIT_LOGS`:

- Login exitoso y fallido.
- Cambio de contraseña.
- Bloqueo de cuenta.
- Acceso denegado por permisos.
- Cambio de plan.
- Eliminación masiva.
- Exportación de datos.
- Cambio de secretos.
- Deploy a producción.

Detalle: [[AUDITORIA.md]].

---

# INCIDENTES

## Plan de respuesta

1. **Detectar**: alertas, logs, reportes.
2. **Contener**: aislar el sistema afectado.
3. **Erradicar**: cerrar la vulnerabilidad.
4. **Recuperar**: restaurar desde backup si necesario.
5. **Post-mortem**: documentar y aprender.

## Contactos

- Equipo técnico.
- SUPER_ADMIN.
- Proveedor de hosting.
- Contacto legal (si breach de datos).

## Comunicación

- A usuarios afectados en 72h (GDPR / Ley 1581).
- A autoridades si aplica (SIC en Colombia).

---

# MONITOREO

Alertas de seguridad:

- > 5 logins fallidos en 5 min desde misma IP.
- Cambio de permisos fuera de horario.
- Anomalía en queries a DB.
- Disco llenándose (DoS por uploads).
- Tráfico inusual.

Detalle: [[MONITOREO.md]].

---

# LOGGING

No loguear:

- Contraseñas (ni hasheadas ni en claro).
- Tokens JWT.
- API keys.
- Datos personales innecesarios.
- Información de tarjetas (PCI DSS, aunque no manejemos).

Sí loguear:

- Acciones críticas.
- Errores con contexto.
- IPs de acceso.
- User agents.

Detalle: [[LOGGING.md]].

---

# CUMPLIMIENTO

## Ley 1581/2012 (Colombia - Habeas Data)

- Aviso de privacidad.
- Consentimiento explícito.
- Derecho de acceso, rectificación, eliminación.
- Registro de tratamiento de datos.
- Encargado del tratamiento designado.

## Ley 1273/2009 (Colombia - Delitos informáticos)

- No facilitar el sistema para actividades ilícitas.

## Estándares seguidos

- OWASP Top 10 (verificar anualmente).
- CIS Benchmarks para Ubuntu.
- PCI DSS (si se manejan pagos, fase 2).

---

# CHECKLIST DE SEGURIDAD

## En cada release

- [ ] npm audit sin vulnerabilidades altas/críticas.
- [ ] Trivy sin vulnerabilidades críticas en imágenes.
- [ ] No secretos en código.
- [ ] Headers de seguridad correctos.
- [ ] Rate limits configurados.
- [ ] Validación de entrada en todos los endpoints nuevos.
- [ ] Auditoría registrada en operaciones críticas.
- [ ] Tests de seguridad pasando (CSRF, XSS, etc).

## Mensual

- [ ] Revisar logs de auditoría.
- [ ] Verificar backups.
- [ ] Actualizar dependencias.
- [ ] Revisar permisos de usuarios.

## Trimestral

- [ ] Test de penetración básico.
- [ ] Revisar accesos.
- [ ] Rotar secretos según política.
- [ ] Revisar compliance.

---

# REGLAS CRÍTICAS

- HTTPS siempre. Nunca HTTP en producción.
- JWT nunca en URL. Solo en Authorization header.
- Secretos nunca en código. Siempre en variables de entorno.
- Toda entrada validada. No confiar en cliente.
- Toda salida escapada. React y CSP.
- Toda acción crítica auditada.
- Toda dependencia actualizada. Monitoreo continuo.
- Toda vulnerabilidad atendida en 24h (crítica) / 1 semana (alta).
- Plan de incidentes listo. Roles definidos.
- Backups probados. Restauración confirmada.
