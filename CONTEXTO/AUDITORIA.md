# AUDITORIA.md

# OBJETIVO

Definir el sistema de auditoría de Mocoa Market.

Alcance:

- Qué se audita.
- Qué no se audita.
- Estructura del log.
- Retención.
- Acceso a logs.
- Cumplimiento.
- Eventos críticos.

Detalle de auth: [[AUTH.md]].

Detalle de RBAC: [[RBAC.md]].

---

# PRINCIPIO FUNDAMENTAL

Toda operación crítica del sistema deja rastro.

La auditoría es:

- **Inmutable**: los registros nunca se modifican ni eliminan (salvo proceso legal).
- **Completa**: incluye quién, qué, cuándo, dónde, antes, después.
- **Indexada**: permite búsqueda por tenant, usuario, fecha, acción.
- **Aislada por tenant**: cada tenant solo ve sus logs (excepto SUPER_ADMIN).

---

# ENTIDAD PRINCIPAL

Fuente: [[Modelo Datos.md]].

## AUDIT_LOGS

```typescript
{
  id: string (UUID)
  tenantId: string | null        // null si es evento cross-tenant
  usuarioId: string | null       // null si fue sistema o falla de auth
  accion: string                 // código de la acción
  entidad: string                // nombre de la entidad afectada
  entidadId: string | null       // id del recurso afectado
  oldValue: JSON | null          // estado anterior (cuando aplique)
  newValue: JSON | null          // estado nuevo (cuando aplique)
  ip: string                     // IP del cliente
  userAgent: string              // navegador/cliente
  metadata: JSON | null          // contexto adicional libre
  createdAt: timestamp
}
```

Índices obligatorios:

- (tenantId, createdAt DESC)
- (tenantId, accion, createdAt DESC)
- (tenantId, usuarioId, createdAt DESC)
- (tenantId, entidad, entidadId, createdAt DESC)

Retención:

- Online: 12 meses.
- Archivo (Postgres separado o S3): 5 años (cuando aplique normativa colombiana).

---

# QUÉ SE AUDITA

## Categoría: Autenticación

| Acción | Código | Captura |
|--------|--------|---------|
| Login exitoso | AUTH_LOGIN_SUCCESS | userId, ip, userAgent |
| Login fallido | AUTH_LOGIN_FAILED | email, ip, razón |
| Logout | AUTH_LOGOUT | userId, refreshTokenId |
| Refresh usado | AUTH_REFRESH_USED | userId, jti |
| Password cambiado | AUTH_PASSWORD_CHANGED | userId |
| Reset solicitado | AUTH_PASSWORD_RESET_REQUESTED | userId, ip |
| Reset completado | AUTH_PASSWORD_RESET_COMPLETED | userId |
| Cuenta bloqueada | AUTH_ACCOUNT_LOCKED | userId, intentos |
| Cuenta desbloqueada | AUTH_ACCOUNT_UNLOCKED | userId |
| Impersonación iniciada | AUTH_IMPERSONATION_STARTED | superAdminId, targetTenantId, razón |
| Impersonación finalizada | AUTH_IMPERSONATION_ENDED | superAdminId, targetTenantId |
| Sesión revocada | AUTH_SESSION_REVOKED | userId, refreshTokenId, razón |

## Categoría: Negocio

| Acción | Código | Captura |
|--------|--------|---------|
| Producto creado | PRODUCT_CREATED | oldValue: null, newValue: { ... } |
| Producto editado | PRODUCT_UPDATED | oldValue, newValue |
| Producto eliminado | PRODUCT_DELETED | oldValue, newValue: null |
| Stock ajustado | STOCK_ADJUSTED | oldValue.stock, newValue.stock, motivo |
| Compra registrada | PURCHASE_CREATED | monto, proveedorId |
| Venta realizada | SALE_CREATED | monto, items count |
| Venta anulada | SALE_VOIDED | motivo, usuarioAnulaId |
| Devolución | SALE_RETURNED | items, monto |
| Caja abierta | CASH_OPENED | saldoInicial |
| Caja cerrada | CASH_CLOSED | saldoEsperado, saldoReal, diferencia |
| Gasto registrado | EXPENSE_CREATED | monto, categoría |
| Pedido creado | ORDER_CREATED | monto, items count |
| Pedido confirmado | ORDER_CONFIRMED | usuarioConfirmaId |
| Pedido cancelado | ORDER_CANCELLED | motivo |
| Cliente creado | CUSTOMER_CREATED | datos básicos |
| Cliente editado | CUSTOMER_UPDATED | oldValue, newValue |
| Cliente eliminado | CUSTOMER_DELETED | oldValue |

## Categoría: Configuración

| Acción | Código | Captura |
|--------|--------|---------|
| Configuración editada | SETTINGS_UPDATED | sección afectada, oldValue, newValue |
| Usuario invitado | USER_INVITED | email, rol |
| Usuario activado | USER_ACTIVATED | userId |
| Usuario desactivado | USER_DEACTIVATED | userId, motivo |
| Plan cambiado | PLAN_CHANGED | planAnteriorId, planNuevoId |
| Plantilla catálogo editada | CATALOG_TEMPLATE_UPDATED | oldValue, newValue |
| Configuración delivery editada | DELIVERY_CONFIG_UPDATED | oldValue, newValue |

## Categoría: Sistema

| Acción | Código | Captura |
|--------|--------|---------|
| Permiso denegado | PERMISSION_DENIED | rol, recurso, motivo |
| Tenant creado | TENANT_CREATED | slug, planId |
| Tenant suspendido | TENANT_SUSPENDED | motivo |
| Tenant reactivado | TENANT_REACTIVATED | motivo |
| Backup ejecutado | BACKUP_EXECUTED | tamaño, duración |
| Job fallido | JOB_FAILED | queue, jobId, error |

---

# QUÉ NO SE AUDITA

Para evitar ruido:

- Lecturas (GET) — salvo el primer acceso a datos sensibles.
- Búsquedas y filtros.
- Pings de health.
- Lectura de catálogos globales.

Se registra por separado en métricas (no en `AUDIT_LOGS`):

- Visitas al marketplace.
- Productos vistos.
- Búsquedas.

Esto mantiene `AUDIT_LOGS` enfocado en acciones de mutación y seguridad.

---

# CÓMO SE IMPLEMENTA

## Opción 1: Interceptor global (NestJS)

```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const auditMeta = this.reflector.get(AUDIT_KEY, context.getHandler());
    if (!auditMeta) return next.handle();

    return next.handle().pipe(
      tap(async (result) => {
        await this.auditService.log({
          tenantId: req.user.tenantId,
          usuarioId: req.user.id,
          accion: auditMeta.accion,
          entidad: auditMeta.entidad,
          entidadId: result?.id,
          oldValue: auditMeta.oldValue,
          newValue: auditMeta.newValue,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }),
    );
  }
}
```

## Opción 2: Servicio explícito

```typescript
await this.auditService.log({
  accion: 'PRODUCT_UPDATED',
  entidad: 'products',
  entidadId: id,
  oldValue: previousProduct,
  newValue: newProduct,
  tenantId,
  usuarioId,
  ip,
  userAgent,
});
```

Se prefiere la opción 2 en operaciones críticas (transacciones Prisma) para garantizar atomicidad.

## En transacciones

```typescript
await prisma.$transaction(async (tx) => {
  const previous = await tx.product.findUnique({ where: { id } });
  const updated = await tx.product.update({ where: { id }, data });
  await tx.auditLog.create({ data: auditData });
});
```

---

# SERVICIO DE AUDITORÍA

```typescript
@Injectable()
export class AuditService {
  async log(entry: AuditLogInput): Promise<void>
  async findByTenant(tenantId, filters): Promise<AuditLog[]>
  async findByUser(tenantId, userId, filters): Promise<AuditLog[]>
  async findByEntity(tenantId, entidad, entidadId): Promise<AuditLog[]>
  async export(tenantId, filters, format): Promise<Buffer>
}
```

## Filtros disponibles

- Rango de fechas.
- Acción.
- Entidad.
- Usuario.
- IP.
- Búsqueda libre en metadata.

## Exportación

- CSV
- Excel
- PDF (con marca y hash de integridad)

Cada export queda auditado: `AUDIT_EXPORT_REALIZED`.

---

# ACCESO A LOGS

## Por rol

- **ADMIN_NEGOCIO**: ve todos los logs de su tenant.
- **SUPERVISOR**: ve logs operativos (ventas, pedidos, caja, gastos) de su tenant. NO ve auth, configuración ni permisos denegados.
- **CAJERO**: ve solo logs de sus propias acciones.
- **DOMICILIARIO**: ve solo logs de sus pedidos asignados.
- **SUPER_ADMIN**: ve logs cross-tenant (sin impersonar) y logs del tenant impersonado (impersonando).

## Endpoints

```
GET  /api/v1/audit-logs
GET  /api/v1/audit-logs/:id
GET  /api/v1/audit-logs/export?format=csv
GET  /api/v1/audit-logs/entity/:entidad/:entidadId
```

Detalle API: [[API.md]].

---

# RETENCIÓN Y ARCHIVO

## Online (PostgreSQL)

- 12 meses.
- Particionado por mes (recomendado para performance).

```sql
CREATE TABLE audit_logs_2026_06 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
```

## Archivo (fase futura)

- Después de 12 meses, mover a tabla `audit_logs_archive` o S3.
- Mantener 5 años.
- Cumplimiento DIAN y protección de datos.

## Eliminación

- Solo por proceso legal documentado.
- Solo SUPER_ADMIN con justificación.
- Genera registro de `AUDIT_LOG_DELETED` antes de borrar.

---

# INTEGRIDAD

## Hash encadenado (opcional, fase 2)

Cada log incluye `hash` calculado de:

```
hash = SHA256(prevHash + json(logEntry))
```

Permite detectar manipulación.

## Timestamp confiable

- Usar `created_at` del servidor (no del cliente).
- Sincronizar NTP en el VPS.
- Opcional: TSA (Time Stamping Authority) para evidencia legal.

---

# MÉTRICAS DERIVADAS

A partir de `AUDIT_LOGS` se pueden obtener:

- Intentos de login fallidos por usuario/IP (detección de brute force).
- Cambios de configuración por tenant.
- Anulaciones de venta por cajero.
- Frecuencia de devoluciones por producto.

Estos cálculos se hacen en jobs nocturnos (BullMQ) y se persisten en tablas de métricas (no en `AUDIT_LOGS`).

---

# ALERTAS

Configurar alertas en base a auditoría:

- Más de 5 intentos fallidos en 10 min → bloquear IP.
- Anulación de venta por encima del 10% del total → alerta a ADMIN.
- Cambio de plan fuera de horario → alerta.
- Cambio de permisos fuera de horario → alerta.
- Exportación masiva de datos → alerta.

Detalle: [[MONITOREO.md]].

---

# EVENTOS RELACIONADOS

- AUDIT_LOG_CREATED
- AUDIT_EXPORT_REALIZED
- AUDIT_LOG_ARCHIVED
- AUDIT_LOG_DELETED

Detalle: [[EVENTOS.md]].

---

# CUMPLIMIENTO

## Colombia

- Ley 1581 de 2012 (Habeas Data).
- Decreto 1377 de 2013.
- Tiempo de retención de datos personales.
- Derecho de acceso, rectificación y eliminación del titular.

## Implicaciones

- Los datos personales del cliente final (nombre, teléfono, dirección) son responsabilidad del tenant.
- SUPER_ADMIN debe dejar registro de todo acceso cross-tenant.
- Al cancelar tenant, datos personales deben anonimizarse tras periodo legal.

---

# REGLAS CRÍTICAS

- Ninguna acción crítica sin audit log.
- Ningún audit log modificable o eliminable por API.
- Toda exportación de audit logs queda registrada.
- SUPER_ADMIN sin impersonar NO ve contenido de logs de tenant.
- Logs no se replican a clientes (solo backend los lee).
- Storage de logs separado lógicamente de datos de negocio.
- Migración de esquema audit_logs requiere coordinación con SUPER_ADMIN.
