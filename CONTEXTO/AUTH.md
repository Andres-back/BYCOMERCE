# AUTH.md

# OBJETIVO

Definir la estrategia de autenticación de la plataforma Mocoa Market.

Alcance:

- Usuarios internos del sistema (admin, supervisores, cajeros, domiciliarios).
- SUPER_ADMIN de la plataforma.
- Clientes finales del marketplace y catálogo digital (invitados).
- Integridad, revocación y rotación de credenciales.

Detalle de permisos: [[RBAC.md]].

Detalle de aislamiento: [[MULTI_TENANT.md]].

---

# DECISIÓN ARQUITECTÓNICA

Estrategia adoptada:

- **Access Token JWT** de corta duración (15 minutos).
- **Refresh Token** de larga duración (7 días) almacenado en base de datos.
- Hashing con **bcrypt** (cost >= 12).
- Sesión del lado servidor manejada por el refresh token (stateful refresh, stateless access).
- Multi-tenant: cada token lleva `tenant_id` para evitar fugas cruzadas.

Razón:

- Permite revocación inmediata (logout, cambio de contraseña, suspensión).
- Compatible con mobile-first (futuro).
- Permite impersonación de SUPER_ADMIN con tenant temporal.

---

# TIPOS DE USUARIO

## Usuarios internos (USERS)

Personas que operan el sistema: ADMIN_NEGOCIO, SUPERVISOR, CAJERO, DOMICILIARIO.

- Autenticación: email + contraseña.
- Acceso: panel `/admin` o `/dashboard`.
- Persistidos en `USERS` con `tenant_id`.

## SUPER_ADMIN (plataforma)

Personal administrativo de Mocoa Market.

- Autenticación: email + contraseña.
- Acceso: panel `/super` (futuro).
- Posee flag `is_super_admin` en `USERS` con `tenant_id = NULL`.
- Puede impersonar cualquier tenant.

## Clientes finales (CUSTOMERS)

Personas que compran en el marketplace o catálogo.

- **No requieren cuenta ni contraseña** en MVP.
- Se identifican por teléfono + nombre + dirección.
- Se crea/actualiza automáticamente el registro en `CUSTOMERS` al hacer un pedido.

---

# ENTIDADES INVOLUCRADAS

Fuente de verdad: [[Modelo Datos.md]].

## USERS

Ya documentada. Campos adicionales propuestos para auth:

- `password_hash` (ya existe)
- `is_super_admin` (boolean, default false)
- `failed_login_attempts` (int, default 0)
- `locked_until` (timestamp, nullable)
- `last_password_change` (timestamp, nullable)
- `must_change_password` (boolean, default false)

## REFRESH_TOKENS (nueva)

Persiste los refresh tokens activos.

Campos:

- id
- user_id
- tenant_id (snapshot del tenant en el momento del login; si impersona, tenant del impersonado)
- token_hash (hash SHA256 del refresh token, nunca el token plano)
- jti (JWT ID, único)
- user_agent
- ip
- expires_at
- revoked_at (nullable)
- revoked_reason (nullable: LOGOUT, PASSWORD_CHANGE, ADMIN_REVOKE, SUSPICIOUS_ACTIVITY)
- replaced_by (nullable, para rotación)
- created_at

## PASSWORD_RESETS (nueva)

Tokens de recuperación de contraseña.

Campos:

- id
- user_id
- token_hash
- expires_at (default 1 hora)
- used_at (nullable)
- ip
- created_at

## LOGIN_ATTEMPTS (nueva)

Registro de intentos de login (éxitos y fracasos).

Campos:

- id
- email
- user_id (nullable si el email no existe)
- ip
- user_agent
- success
- failure_reason
- created_at

---

# FLUJOS

## Registro de usuario interno

```
ADMIN_NEGOCIO invita usuario
  ↓
Backend genera token de invitación (válido 48h)
  ↓
Email con link: /auth/accept-invitation?token=...
  ↓
Usuario completa: nombre, contraseña
  ↓
Backend valida token + crea USERS + must_change_password=false
  ↓
Auditoría: USUARIO_INVITADO
```

## Login

```
POST /api/v1/auth/login
  { email, password, tenant_slug (opcional) }
  ↓
Backend:
  1. Buscar usuario por email (global o por tenant)
  2. Verificar lock por intentos fallidos
  3. Verificar contraseña (bcrypt.compare)
  4. Si OK: generar access + refresh
  5. Guardar refresh hasheado en REFRESH_TOKENS
  6. Registrar LOGIN_ATTEMPTS
  ↓
Response:
  {
    accessToken: "...",
    refreshToken: "...",
    user: { id, nombre, rol, tenantId },
    expiresIn: 900
  }
```

## Refresh

```
POST /api/v1/auth/refresh
  { refreshToken: "..." }
  ↓
Backend:
  1. Buscar REFRESH_TOKENS por token_hash
  2. Verificar no expirado y no revocado
  3. Generar nuevo access + nuevo refresh
  4. Marcar el anterior como replaced_by
  5. Guardar el nuevo refresh
  ↓
Response: nuevo access + nuevo refresh (rotación)
```

## Logout

```
POST /api/v1/auth/logout
  { refreshToken: "..." }
  ↓
Backend:
  1. Marcar refresh como revocado (revoked_at, revoked_reason=LOGOUT)
  ↓
Cliente: descartar access token (no se puede revocar, expira solo)
```

## Cambio de contraseña

```
POST /api/v1/auth/change-password
  { currentPassword, newPassword }
  ↓
Backend:
  1. Verificar contraseña actual
  2. Hashear nueva contraseña (bcrypt cost 12)
  3. Actualizar USERS.password_hash y last_password_change
  4. Revocar TODOS los refresh tokens activos del usuario
  5. Generar nuevo par de tokens
  6. Auditoría
```

## Recuperación de contraseña

```
POST /api/v1/auth/forgot-password
  { email }
  ↓
Backend:
  1. Generar PASSWORD_RESETS (token de 1h)
  2. Enviar email con link
  3. Auditoría: PASSWORD_RESET_REQUESTED

POST /api/v1/auth/reset-password
  { token, newPassword }
  ↓
Backend:
  1. Validar token
  2. Marcar usado
  3. Cambiar contraseña
  4. Revocar todos los refresh
  5. Auditoría
```

## Impersonación de SUPER_ADMIN

```
POST /api/v1/super/impersonate
  { tenantId, reason }
  ↓
Backend:
  1. Verificar is_super_admin=true
  2. Crear refresh con tenant_id = tenant objetivo
  3. Marcar impersonation_session=true + audit_log con reason
  4. Generar access con claim impersonatedBy
  ↓
Para salir:
  POST /api/v1/auth/stop-impersonation
  → Revoca refresh impersonado y restaura sesión original
```

---

# ESTRUCTURA DEL JWT (ACCESS)

Header:

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

Payload:

```json
{
  "sub": "user_uuid",
  "email": "user@example.com",
  "rol": "ADMIN_NEGOCIO",
  "tenantId": "tenant_uuid",
  "isSuperAdmin": false,
  "impersonatedBy": null,
  "iat": 1717000000,
  "exp": 1717000900,
  "jti": "unique_id"
}
```

Claims personalizados:

- `sub`: user id
- `rol`: nombre del rol
- `tenantId`: id del tenant activo
- `isSuperAdmin`: flag
- `impersonatedBy`: id del super admin si impersona
- `jti`: identificador único del token

El `jti` se registra en una lista de revocación opcional en Redis (solo para casos críticos).

---

# CONFIGURACIÓN

Variables de entorno:

```
JWT_ACCESS_SECRET=<secreto-fuerte-256-bits>
JWT_REFRESH_SECRET=<otro-secreto-distinto>
JWT_ACCESS_TTL=900            # 15 minutos en segundos
JWT_REFRESH_TTL=604800        # 7 días en segundos
BCRYPT_COST=12
MAX_LOGIN_ATTEMPTS=5
LOCK_DURATION_MINUTES=15
PASSWORD_RESET_TTL=3600
INVITATION_TTL=172800         # 48h
```

Secretos fuera del repositorio. Cifrados en variables de entorno del VPS.

Detalle: [[SEGURIDAD.md]] y [[eviroments.md]].

---

# SEGURIDAD DE CONTRASEÑAS

Política:

- Mínimo 8 caracteres.
- Al menos 1 mayúscula, 1 minúscula, 1 número.
- Validación con regex en backend (class-validator).
- Hash con bcrypt, cost >= 12.
- No permitir contraseñas en común (top 1000).
- Forzar cambio en primer login si fue invitación.
- No permitir reutilizar las últimas 3 contraseñas (campo opcional en USERS).

Rate limit en login:

- 5 intentos fallidos → bloqueo de 15 minutos.
- 10 intentos fallidos en 1 hora → notificación al ADMIN_NEGOCIO.

---

# AUTENTICACIÓN DE CLIENTES (GUESTS)

En MVP el cliente final:

- NO tiene cuenta.
- NO tiene contraseña.
- Se identifica por teléfono en cada pedido.
- Se crea/actualiza CUSTOMERS al primer pedido.

Campos mínimos requeridos al hacer pedido:

- nombre
- teléfono
- dirección
- latitud / longitud (opcional, recomendado)

Si ya existe cliente con mismo teléfono en el tenant, se reutiliza y se actualiza su última compra.

Detalle: [[CRM_CLIENTE.md]].

---

# ENDPOINTS RESUMIDOS

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/v1/auth/login | Login email + password |
| POST | /api/v1/auth/refresh | Renovar tokens |
| POST | /api/v1/auth/logout | Cerrar sesión |
| POST | /api/v1/auth/change-password | Cambiar contraseña |
| POST | /api/v1/auth/forgot-password | Solicitar reset |
| POST | /api/v1/auth/reset-password | Confirmar reset |
| POST | /api/v1/auth/accept-invitation | Aceptar invitación |
| GET | /api/v1/auth/me | Usuario actual |
| POST | /api/v1/super/impersonate | Impersonar tenant |
| POST | /api/v1/auth/stop-impersonation | Salir de impersonación |

Detalle completo de API: [[API.md]].

---

# EVENTOS

- USUARIO_INVITADO
- USUARIO_ACTIVADO
- LOGIN_EXITOSO
- LOGIN_FALLIDO
- PASSWORD_CAMBIADO
- PASSWORD_RESET_SOLICITADO
- PASSWORD_RESET_COMPLETADO
- SESION_REVOCADA
- IMPERSONATION_INICIADA
- IMPERSONATION_FINALIZADA
- CUENTA_BLOQUEADA

Detalle: [[EVENTOS.md]].

---

# AUDITORÍA

Todo evento de auth genera entrada en `AUDIT_LOGS`:

- Login exitoso y fallido.
- Logout.
- Cambio de contraseña.
- Reset solicitado y completado.
- Impersonación iniciada y finalizada.
- Cuenta bloqueada.
- Refresh revocado por admin.

Detalle: [[AUDITORIA.md]].

---

# REGLAS CRÍTICAS

- JWT nunca viaja por URL (siempre en Authorization header o body de refresh).
- Refresh tokens SIEMPRE hasheados en DB (nunca en texto plano).
- Access token expira en máximo 15 minutos.
- Refresh token expira en máximo 7 días.
- Logout invalida refresh, no access (access expira solo).
- Cambio de contraseña invalida TODOS los refresh activos.
- SUPER_ADMIN nunca tiene acceso a datos de tenant sin pasar por impersonación.
- Toda impersonación queda auditada con motivo obligatorio.
- Bloqueo por intentos fallidos aplica también a SUPER_ADMIN.
- No se permite login si `USERS.estado != 'ACTIVO'`.
- No se permite login si `TENANTS.estado != 'ACTIVO'` o suscripción vencida (decisión pendiente si bloqueante o de solo lectura).
