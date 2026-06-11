# Credenciales de prueba - Mocoa Market

## URL
```
Frontend: http://localhost:3000
Backend:  http://localhost:3001
```

---

## Roles y accesos

### 🛡️ Superadmin
Acceso total a la plataforma. Gestiona tenants, planes, auditoría.

| Campo    | Valor                                                      |
| -------- | ---------------------------------------------------------- |
| Email    | `superadmin@mocoamarket.com`                               |
| Password | `SuperAdmin123!`                                           |
| Panel    | `/admin/superadmin`                                        |
| Permisos | Crear tenants, gestionar planes, ver auditoría, impersonar |

### 🏪 Admin Negocio
Panel completo del comercio. Gestión operativa total.

| Campo | Valor |
|-------|-------|
| Email | `admin@demo.com` |
| Password | `Admin1234!` |
| Panel | `/admin` |
| Permisos | Inventario, POS, clientes, pedidos, caja, reportes, usuarios, promociones, fidelización, sucursales, configuración |

### 👁️ Supervisor
Panel limitado. Solo lectura en algunas secciones.

| Campo | Valor |
|-------|-------|
| Email | `supervisor@demo.com` |
| Password | `Super1234!` |
| Permisos | Clientes, inventario, pedidos, promociones, domiciliarios, POS, caja, reportes, notificaciones |

### 💳 Cajero
Solo POS y caja.

| Campo | Valor |
|-------|-------|
| Email | `cajero@demo.com` |
| Password | `Cajero1234!` |
| Permisos | POS, caja, notificaciones |

### 🚚 Domiciliario
Solo pedidos asignados y ruta de entrega.

| Campo | Valor |
|-------|-------|
| Email | `domiciliario@demo.com` |
| Password | `Domi1234!` |
| Permisos | Pedidos (ver asignados), notificaciones |

---

## Tenants de prueba

| Negocio | Slug | Admin | URL tienda |
|---------|------|-------|------------|
| Tienda Demo Mocoa | `tienda-demo-mocoa` | admin@demo.com | `/negocio/tienda-demo-mocoa` |
| Panadería La Esperanza | `panaderia-esperanza` | jose@panaderia.com | `/negocio/panaderia-esperanza` |

---

## Planes de suscripción

| Plan | Precio/mes | Usuarios | Productos | Almacenamiento |
|------|-----------|----------|-----------|---------------|
| 🟢 Básico | $5.000 | 1 | 30 | 1 GB |
| 🔵 Profesional | $15.000 | 3 | 200 | 2 GB |
| 🟣 Premium | $30.000 | 10 | 1.000 | 10 GB |
| 🔴 Enterprise | $80.000 | 100 | Ilimitado | 100 GB |

---

## Rutas principales

### Públicas
| Ruta | Descripción |
|------|-------------|
| `/` | Marketplace / Home |
| `/auth/login` | Inicio de sesión |
| `/negocio/[slug]` | Catálogo público del negocio |
| `/marketplace` | Vista de productos |

### Admin
| Ruta | Descripción |
|------|-------------|
| `/admin` | Dashboard |
| `/admin/customers` | Clientes |
| `/admin/inventory` | Inventario |
| `/admin/purchases` | Compras |
| `/admin/orders` | Pedidos |
| `/admin/pos` | Punto de venta |
| `/admin/cash` | Caja |
| `/admin/users` | Usuarios |
| `/admin/plans` | Suscripción |
| `/admin/settings` | Configuración |
| `/admin/reports` | Reportes |
| `/admin/notifications` | Notificaciones |
| `/admin/delivery` | Domiciliarios |
| `/admin/delivery/route` | Ruta de entrega |
| `/admin/promotions` | Promociones |
| `/admin/loyalty` | Fidelización |
| `/admin/branches` | Sucursales |

### Superadmin
| Ruta | Descripción |
|------|-------------|
| `/admin/superadmin` | Panel de control |
| `/admin/superadmin/tenants` | Gestión de tenants |
| `/admin/superadmin/plans` | Planes de suscripción |
| `/admin/superadmin/audit` | Auditoría |

---

## Atajos de teclado (POS)
| Tecla | Acción |
|-------|--------|
| `Ctrl+F` | Buscar producto |
| `F2` | Cobrar |
| `F4` | Método de pago |
| `Ctrl+N` | Nueva venta |
| `Esc` | Cancelar / cerrar modal |
| `Ctrl+K` | Paleta de comandos global |
