# WEBSOCKETS.md

# OBJETIVO

Definir la estrategia de comunicación en tiempo real de Mocoa Market.

Alcance:

- Proveedor tecnológico.
- Autenticación.
- Salas (rooms) y namespaces.
- Mensajes.
- Reconexión.
- Casos de uso (pedidos, tracking, caja, notificaciones).

Detalle de eventos: [[EVENTOS.md]].

Detalle de auth: [[AUTH.md]].

---

# DECISIÓN ARQUITECTÓNICA

- **Socket.io** como servidor y cliente.
- **Redis Adapter** para escalar a múltiples instancias.
- Autenticación por JWT en handshake.
- Salas por tenant + recurso.

Razones:

- Reconexión automática.
- Salas nativas.
- Compatible con React, React Native (futuro mobile).
- Redis Adapter evita sticky sessions en Nginx.

---

# SERVIDOR

## Stack

- `@nestjs/websockets` con adaptador Socket.io.
- Redis Adapter (`@socket.io/redis-adapter`) sobre Redis.
- Namespace principal: `/realtime`.

## Bootstrap

```typescript
const io = new Server(httpServer, {
  cors: { origin: env.ALLOWED_ORIGINS, credentials: true },
  path: '/socket.io',
});

io.adapter(createAdapter(pubClient, subClient));
```

## Handshake

El cliente se conecta enviando el JWT:

```typescript
const socket = io(`${API_URL}/realtime`, {
  auth: { token: accessToken },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
```

## Middleware de auth

```typescript
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('UNAUTHORIZED'));

  try {
    const payload = await this.jwtService.verifyAsync(token);
    socket.data.user = payload;
    socket.data.tenantId = payload.tenantId;
    next();
  } catch (err) {
    next(new Error('INVALID_TOKEN'));
  }
});
```

---

# SALAS (ROOMS)

## Convenciones

- Sala global del tenant: `tenant:{tenantId}`.
- Sala de un recurso: `tenant:{tenantId}:{recurso}:{id}`.
- Sala de un usuario: `tenant:{tenantId}:user:{userId}`.

## Suscripción automática

Al conectar, el socket se une automáticamente a:

- `tenant:{tenantId}` (global del tenant).
- `tenant:{tenantId}:user:{userId}` (personal del usuario).

Otras salas se unen explícitamente.

## Salas típicas

| Sala | Miembros | Eventos |
|------|----------|---------|
| `tenant:{id}` | Todos los usuarios del tenant | eventos globales del tenant |
| `tenant:{id}:orders` | Admin, supervisores, cajeros | cambios en pedidos |
| `tenant:{id}:orders:{orderId}` | Admin, supervisores, cajeros, domiciliario asignado, cliente | cambios en un pedido específico |
| `tenant:{id}:pos` | Cajeros, supervisores | alertas de caja, ventas |
| `tenant:{id}:inventory` | Admin, supervisores | alertas de stock |
| `tenant:{id}:user:{userId}` | El propio usuario | notificaciones personales |
| `tenant:{id}:crm` | Cajeros, admin | alertas CRM |
| `tenant:{id}:reports` | Admin, supervisores | actualizaciones de reportes |

---

# EVENTOS DE WEBSOCKET

## Cliente → Servidor

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `subscribe` | `{ room: string }` | Unirse a una sala |
| `unsubscribe` | `{ room: string }` | Salir de una sala |
| `ping` | `{}` | Heartbeat |
| `presence.online` | `{}` | Marcar como en línea |
| `presence.away` | `{}` | Marcar como ausente |

## Servidor → Cliente

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `connect` | `{}` | Conexión exitosa |
| `disconnect` | `{ reason: string }` | Desconexión |
| `error` | `{ code: string, message: string }` | Error |
| `event` | `{ name: string, data: any, occurredAt: ISO }` | Evento de dominio (genérico) |
| `notification` | `{ id, title, body, level, action? }` | Notificación in-app |
| `order.updated` | `{ orderId, status, ... }` | Cambio de estado de pedido |
| `inventory.alert` | `{ productId, stock, stockMinimo }` | Alerta de stock bajo |
| `pos.sale.completed` | `{ saleId, total }` | Venta POS realizada (en otro terminal) |
| `cash.movement` | `{ cashRegisterId, tipo, monto }` | Movimiento de caja |
| `delivery.tracking` | `{ orderId, lat, lng }` | Tracking del domiciliario (futuro) |

---

# EMISIÓN DESDE BACKEND

## Service que publica

```typescript
@Injectable()
export class OrdersService {
  constructor(
    private readonly realtimeService: RealtimeService,
  ) {}

  async confirmOrder(orderId: string) {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { estado: 'CONFIRMADO' },
    });

    // Emitir a la sala del tenant
    this.realtimeService.emitToTenant(order.tenantId, 'order.updated', {
      orderId: order.id,
      status: order.estado,
    });

    // Emitir a la sala específica del pedido
    this.realtimeService.emitToRoom(
      `tenant:${order.tenantId}:orders:${orderId}`,
      'order.updated',
      order,
    );
  }
}
```

## RealtimeService

```typescript
@Injectable()
export class RealtimeService {
  private server: Server;

  setServer(server: Server) { this.server = server; }

  emitToTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  emitToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  emitToUser(tenantId: string, userId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}:user:${userId}`).emit(event, data);
  }
}
```

---

# CASOS DE USO

## 1. Pedido en tiempo real

```
Cliente hace pedido desde el catálogo
  ↓
OrdersService.create
  ↓
Emite evento 'pedido.creado' (BullMQ + WebSocket)
  ↓
WebSocket emite a sala 'tenant:{id}:orders'
  ↓
Panel del comercio actualiza lista de pedidos en vivo
  ↓
Comercio confirma → 'pedido.confirmado' → notifica al cliente
```

## 2. POS multi-cajero

```
Cajero A hace venta
  ↓
SalesService.create
  ↓
Emite 'venta.realizada' → sala 'tenant:{id}:pos'
  ↓
Cajero B ve alerta de venta (actualización de totales)
  ↓
Supervisor ve dashboard actualizado
```

## 3. Alerta de stock bajo

```
Stock cae por debajo del mínimo
  ↓
InventoryService detecta
  ↓
Emite 'stock.bajo' → sala 'tenant:{id}:inventory'
  ↓
Admin ve alerta en tiempo real
  ↓
Si configurado, también: WhatsApp al ADMIN
```

## 4. Notificación personal

```
Pedido asignado a domiciliario
  ↓
Emite a 'tenant:{id}:user:{domiciliarioId}'
  ↓
Domiciliario ve push en su app
```

## 5. Tracking de domiciliario (futuro)

```
Domiciliario envía GPS cada N segundos
  ↓
Backend procesa y emite a 'tenant:{id}:orders:{orderId}'
  ↓
Cliente ve ubicación en tiempo real en su pedido
```

---

# PRESENCIA

Estado de cada usuario:

- `online`: conectado activamente.
- `away`: conectado pero inactivo > 5 min.
- `offline`: desconectado.

## Implementación

- En `connect` → set estado `online` en Redis: `presence:tenant:{id}:user:{userId}`.
- En `disconnect` → set estado `offline` (con TTL de 30s para reconexión).
- Heartbeat cada 30s del cliente → refresh TTL.
- Si TTL expira → estado `offline` automático.

## Endpoint de consulta

```
GET /api/v1/users/online
→ { users: [{ userId, lastSeen, estado }] }
```

Útil para asignación de pedidos a domiciliarios disponibles.

---

# RECONEXIÓN

Socket.io maneja reconexión automática.

Estrategia:

- Backoff exponencial.
- Re-unirse a salas automáticamente tras reconectar.
- Re-enviar último `eventId` recibido para sincronizar.
- Si reconexión falla en 30s, notificar al cliente.

## Backend

Si el cliente se desconecta, el servidor:

- Mantiene al usuario en Redis con TTL 30s.
- Si reconecta, restaura salas.
- Si no reconecta, lo marca offline.

---

# ESCALABILIDAD

- Redis Adapter permite N instancias del backend detrás de Nginx.
- Nginx con sticky sessions NO necesario (gracias a Redis Adapter).
- WebSockets soportados por Nginx (Upgrade header).

## Variables Nginx

```nginx
location /socket.io/ {
  proxy_pass http://backend;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_read_timeout 86400s;
}
```

---

# SEGURIDAD

- JWT obligatorio en handshake.
- Validación de `tenantId` en cada mensaje.
- Rate limit por conexión (max eventos / segundo).
- Tamaño máximo de mensaje: 10KB.
- Sin envío de datos sensibles sin cifrar (usar HTTPS).
- Logs de conexión/desconexión.

## CSP y CORS

```typescript
cors: {
  origin: env.ALLOWED_ORIGINS,
  credentials: true,
}
```

Solo orígenes permitidos en `ALLOWED_ORIGINS`.

---

# MONITOREO

- Métricas: conexiones activas, mensajes/segundo, latencia.
- Logs: conexión, desconexión, errores.
- Alertas: si > 1000 conexiones simultáneas (umbral inicial).

---

# EVENTOS RELACIONADOS

- `ws.connection.established`
- `ws.connection.closed`
- `ws.message.received`
- `ws.message.sent`
- `presence.updated`

Detalle: [[EVENTOS.md]].

---

# REGLAS CRÍTICAS

- Toda conexión requiere JWT válido.
- Toda sala incluye `tenantId`.
- Un usuario no puede unirse a sala de otro tenant.
- Ningún cliente puede emitir eventos críticos (solo lectura o comandos predefinidos).
- Mensajes > 10KB se rechazan.
- Heartbeat obligatorio cada 30s.
- Sin mensajes broadcast a todos los tenants.
- El servidor NUNCA confía en datos del cliente sin validar.
- Presencia usa TTL automático (nunca expira manualmente sin razón).
