# RBAC.md

# OBJETIVO

Definir el control de acceso basado en roles (RBAC) de Mocoa Market.

Alcance:

- Roles disponibles.
- Permisos por rol.
- Aplicación en backend (Guards).
- Aplicación en frontend (UI).
- Multi-tenant y permisos.
- SUPER_ADMIN cross-tenant.

Detalle de autenticación: [[AUTH.md]].

Detalle de multi-tenant: [[MULTI_TENANT.md]].

---

# DECISIÓN ARQUITECTÓNICA

Granularidad: **Por módulo** (cada rol accede a un conjunto completo de módulos).

Razón:

- MVP requiere simplicidad.
- Los roles del proyecto son naturalmente disjuntos.
- Permite crecer a granularidad de acción en el futuro sin romper contratos.

Ruta de evolución:

- MVP: rol → módulos permitidos.
- Fase 2: rol → acción por módulo (CRUD).
- Fase 3: ABAC (atributos) si multi-sucursal lo requiere.

---

# ROLES DEL SISTEMA

Fuente: [[Modelo Datos.md]] y [[REGLAS_IA.md]].

## Catálogo de roles

| Código | Nombre | Tipo | Tenant |
|--------|--------|------|--------|
| SUPER_ADMIN | Administrador de plataforma | Plataforma | NULL (cross-tenant) |
| ADMIN_NEGOCIO | Administrador del comercio | Tenant | tenant_id |
| SUPERVISOR | Supervisor operativo | Tenant | tenant_id |
| CAJERO | Cajero POS | Tenant | tenant_id |
| DOMICILIARIO | Repartidor | Tenant | tenant_id |

Roles seed se crean en migración inicial. No se pueden eliminar (solo desactivar).

---

# MATRIZ DE PERMISOS POR MÓDULO

Leyenda: ✅ Acceso total, 🔶 Acceso parcial, ❌ Sin acceso, 🔧 Configuración

## Matriz general

| Módulo | SUPER_ADMIN | ADMIN_NEGOCIO | SUPERVISOR | CAJERO | DOMICILIARIO |
|--------|------------|---------------|------------|--------|--------------|
| Inventario | ❌ | ✅ | 🔶 | 🔶 | ❌ |
| Compras | ❌ | ✅ | 🔶 | ❌ | ❌ |
| POS | ❌ | ✅ | ✅ | ✅ | ❌ |
| Caja | ❌ | ✅ | ✅ | ✅ | ❌ |
| Clientes | ❌ | ✅ | 🔶 | 🔶 | 🔶 |
| Pedidos web | ❌ | ✅ | ✅ | 🔶 | 🔶 |
| Domicilios | ❌ | ✅ | ✅ | ❌ | ✅ |
| Reportes | ❌ | ✅ | 🔶 | 🔶 | ❌ |
| Configuración | ❌ | ✅ | ❌ | ❌ | ❌ |
| Usuarios | ❌ | ✅ | ❌ | ❌ | ❌ |
| Suscripción | ✅ | 🔶 | ❌ | ❌ | ❌ |
| Auditoría | ✅ | 🔶 | ❌ | ❌ | ❌ |
| Catálogo digital | ❌ | ✅ | 🔶 | ❌ | ❌ |
| Marketplace (gestión) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Panel super | ✅ | ❌ | ❌ | ❌ | ❌ |

## Matriz detallada por sub-acción

### Inventario

| Acción | ADMIN_NEGOCIO | SUPERVISOR | CAJERO |
|--------|---------------|------------|--------|
| Ver productos | ✅ | ✅ | ✅ (solo lectura) |
| Crear producto | ✅ | ❌ | ❌ |
| Editar producto | ✅ | ✅ | ❌ |
| Eliminar producto | ✅ | ❌ | ❌ |
| Ajustar stock | ✅ | ✅ | ❌ |
| Ver movimientos | ✅ | ✅ | ❌ |
| Importar / Exportar | ✅ | ✅ | ❌ |

### POS

| Acción | ADMIN_NEGOCIO | SUPERVISOR | CAJERO |
|--------|---------------|------------|--------|
| Realizar venta | ✅ | ✅ | ✅ |
| Anular venta | ✅ | ✅ | ❌ |
| Devolución | ✅ | ✅ | 🔶 (requiere aprobación) |
| Abrir caja | ✅ | ✅ | ✅ |
| Cerrar caja | ✅ | ✅ | ✅ |
| Ver arqueo | ✅ | ✅ | 🔶 (solo sus cajas) |
| Registrar gasto | ✅ | ✅ | ✅ |
| Anular gasto | ✅ | ✅ | ❌ |

### Pedidos

| Acción | ADMIN_NEGOCIO | SUPERVISOR | CAJERO | DOMICILIARIO |
|--------|---------------|------------|--------|--------------|
| Ver pedidos | ✅ | ✅ | ✅ (solo asignados) | ✅ (solo asignados) |
| Confirmar pedido | ✅ | ✅ | ❌ | ❌ |
| Rechazar pedido | ✅ | ✅ | ❌ | ❌ |
| Cambiar a EN_CAMINO | ✅ | ✅ | ❌ | ✅ |
| Marcar ENTREGADO | ✅ | ✅ | ❌ | ✅ |
| Cancelar pedido | ✅ | ✅ | ❌ | ❌ |
| Asignar domiciliario | ✅ | ✅ | ❌ | ❌ |

### Clientes (CRM)

| Acción | ADMIN_NEGOCIO | SUPERVISOR | CAJERO |
|--------|---------------|------------|--------|
| Ver clientes | ✅ | ✅ | ✅ |
| Crear cliente | ✅ | ✅ | ✅ |
| Editar cliente | ✅ | ✅ | 🔶 (solo datos básicos) |
| Eliminar cliente | ✅ | ❌ | ❌ |
| Ver historial completo | ✅ | ✅ | ❌ |
| Asignar etiquetas | ✅ | ✅ | ❌ |

### Reportes

| Acción | ADMIN_NEGOCIO | SUPERVISOR | CAJERO |
|--------|---------------|------------|--------|
| Dashboard ejecutivo | ✅ | ✅ | ❌ |
| Reportes de ventas | ✅ | ✅ | 🔶 (solo sus ventas) |
| Reportes de inventario | ✅ | ✅ | ❌ |
| Reportes financieros | ✅ | ❌ | ❌ |
| Exportar | ✅ | ✅ | 🔶 |

### Configuración

| Acción | ADMIN_NEGOCIO | Otros |
|--------|---------------|-------|
| Datos del negocio | ✅ | ❌ |
| Plantilla del catálogo | ✅ | ❌ |
| Configurar entregas | ✅ | ❌ |
| Configurar notificaciones | ✅ | ❌ |
| Invitar usuarios | ✅ | ❌ |
| Gestionar suscripción | ❌ (solo ver) | ❌ |
| Cancelar suscripción | ❌ | ❌ |

---

# APLICACIÓN EN BACKEND

## Decoradores

```typescript
@Roles('ADMIN_NEGOCIO', 'SUPERVISOR')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/sales')
export class SalesController { ... }
```

## RolesGuard

Valida que el `rol` del JWT esté en la lista permitida del endpoint.

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get(Roles, context.getHandler());
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.rol);
  }
}
```

## TenantGuard

Valida que el recurso solicitado pertenezca al `tenantId` del JWT (excepto SUPER_ADMIN).

```typescript
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user, params } = context.switchToHttp().getRequest();
    if (user.isSuperAdmin) return true; // puede ver cualquiera

    const tenantId = await this.resolveTenantFromResource(params);
    return tenantId === user.tenantId;
  }
}
```

## ModuleGuard (opcional, fase 2)

Verifica que el rol pueda acceder al módulo solicitado.

---

# APLICACIÓN EN FRONTEND

## Hook de permisos

```typescript
const { canAccess, can } = usePermissions();

if (!can('INVENTARIO', 'CREATE')) return <NoAccess />;
```

## Ocultar vs deshabilitar

- Acciones de lectura: ocultar si no tiene permiso.
- Acciones de escritura: deshabilitar con tooltip explicativo.

## Rutas protegidas

Middleware de Next.js que:

1. Verifica sesión.
2. Verifica rol permitido para la ruta.
3. Redirige a /403 si no.

---

# GESTIÓN DE PERMISOS

- Los roles son catálogo global, no se crean dinámicamente en MVP.
- Los permisos por rol son hardcodeados en el código (no en DB) en MVP.
- Futuro: tabla `ROLE_PERMISSIONS` para hacerlos configurables.

Razón:

- Reduce complejidad.
- Los roles son estables y bien definidos.
- Permite migrar a DB sin cambiar contratos.

---

# SUPER_ADMIN CROSS-TENANT

Detalle: [[AUTH.md]] sección Impersonación.

Reglas:

- SUPER_ADMIN tiene rol independiente (`SUPER_ADMIN` con `tenant_id = NULL`).
- Para acceder a datos de un tenant, DEBE impersonar.
- Toda impersonación queda auditada.
- SUPER_ADMIN nunca tiene `tenant_id` en sus queries normales (consulta metadata agregada).
- SUPER_ADMIN nunca edita datos de tenant sin impersonar.

Acciones permitidas sin impersonar:

- Ver listado de tenants.
- Ver planes y suscripciones.
- Ver métricas agregadas (MRR, churn, CAC).
- Suspender / reactivar tenants.
- Acceder a soporte sin ver datos sensibles del tenant (puede pedir impersonación).

---

# USUARIOS DENTRO DE UN TENANT

Cada `USERS` pertenece a un único `tenant_id`.

Reglas:

- `ADMIN_NEGOCIO` puede invitar usuarios a su tenant.
- `SUPERVISOR` y otros no pueden invitar.
- Un usuario no pertenece a múltiples tenants (en MVP).
- Futuro: soporte multi-tenant por usuario (colaborador externo) si un contador maneja varios comercios.

Límite por plan:

- `PLANS.limite_usuarios` define máximo de usuarios activos por tenant.
- Backend valida antes de invitar.
- Si se reduce el plan y excede, los usuarios pasan a `estado = 'SUSPENDIDO'`.

---

# INVITACIONES

Flujo:

```
ADMIN_NEGOCIO → envía email + rol
  ↓
Backend crea USERS (estado=PENDIENTE) + token de invitación
  ↓
Email: link con token
  ↓
Usuario completa registro
  ↓
USERS.estado = ACTIVO
```

Reenvío:

- Si la invitación expira (48h), se puede reenviar.
- Máximo 3 reenvíos por invitación.

---

# EVENTOS RELACIONADOS

- USUARIO_INVITADO
- USUARIO_ACTIVADO
- USUARIO_DESACTIVADO
- ROL_ASIGNADO (futuro)
- PERMISO_DENEGADO (cuando un guard rechaza, se audita)
- IMPERSONATION_INICIADA
- IMPERSONATION_FINALIZADA

Detalle: [[EVENTOS.md]] y [[AUDITORIA.md]].

---

# REGLAS CRÍTICAS

- Ningún endpoint queda sin guard (excepto `/auth/*` públicos y `/health`).
- Toda denegación por guard genera entrada en `AUDIT_LOGS`.
- SUPER_ADMIN nunca tiene `tenant_id` salvo durante impersonación.
- Roles no se pueden crear ni eliminar dinámicamente.
- El límite de usuarios por plan se valida SIEMPRE antes de activar un nuevo usuario.
- La UI frontend NUNCA debe ser la única barrera de seguridad (siempre backend valida).
- Permisos no son secretos: aunque un usuario los descubra, el backend los valida.
