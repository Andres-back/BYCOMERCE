# GEOLOCALIZACION.md

# OBJETIVO

Definir la estrategia de geolocalización de Mocoa Market.

Alcance:

- Stack: PostgreSQL + PostGIS.
- Modelo de datos geográficos.
- Consultas de proximidad.
- Integración con mapas.
- Direcciones de clientes y comercios.
- Cobertura de domicilios.
- Tracking (futuro).

Detalle de domicilios: [[DOMICILIOS.md]].

Detalle de marketplace: [[MARKETPLACE.md]].

Detalle de integraciones: [[INTEGRACIONES.md]].

---

# DECISIÓN ARQUITECTÓNICA

- **PostGIS** para datos geográficos en PostgreSQL.
- Tipo `geography(Point, 4326)` (WGS 84, estándar GPS).
- Índices GIST en columnas geográficas.
- Consultas con `ST_DWithin`, `ST_Distance`.
- Renderizado de mapas con **OpenStreetMap + Leaflet**.

Razones:

- PostGIS ya es parte del stack oficial.
- Cálculos de distancia precisos.
- Índices espaciales eficientes.
- OpenStreetMap gratis y suficiente para MVP.

---

# MODELO DE DATOS

Fuente: [[Modelo Datos.md]].

## TENANTS.ubicacion

```sql
ALTER TABLE tenants
ADD COLUMN ubicacion geography(Point, 4326);

CREATE INDEX idx_tenants_ubicacion ON tenants USING GIST (ubicacion);
```

Datos de entrada: `latitud`, `longitud` (ya existen como columnas separadas).

Migración para poblar:

```sql
UPDATE tenants
SET ubicacion = ST_SetSRID(ST_MakePoint(longitud, latitud), 4326)::geography
WHERE latitud IS NOT NULL AND longitud IS NOT NULL;
```

## CUSTOMERS.ubicacion

```sql
ALTER TABLE customers
ADD COLUMN ubicacion geography(Point, 4326);

CREATE INDEX idx_customers_ubicacion ON customers USING GIST (ubicacion);
```

## ORDERS.ubicacion

```sql
ALTER TABLE orders
ADD COLUMN ubicacion geography(Point, 4326);

CREATE INDEX idx_orders_ubicacion ON orders USING GIST (ubicacion);
```

## DELIVERY_CONFIG.radioCobertura

Configuración por tenant del área de cobertura.

```typescript
{
  tenantId: string,
  radioKm: number,
  // El área se calcula dinámicamente: ST_Buffer(tenant.ubicacion, radioKm)
}
```

## BRANCHES.ubicacion (multi-sucursal)

Para SUCURSALES (fase 2).

---

# CONSULTAS COMUNES

## Encontrar tenants cercanos

```sql
SELECT id, nombre, slug, categoria, direccion,
  ST_Distance(ubicacion, ST_MakePoint($lng, $lat)::geography) AS distance_meters
FROM tenants
WHERE ST_DWithin(ubicacion, ST_MakePoint($lng, $lat)::geography, $radio_metros)
  AND estado = 'ACTIVO'
  AND ST_Distance(ubicacion, ST_MakePoint($lng, $lat)::geography) IS NOT NULL
ORDER BY distance_meters ASC
LIMIT $limite;
```

## Encontrar productos en tenants cercanos

```sql
SELECT p.id, p.nombre, p.precio, t.nombre AS tenant_nombre, t.slug AS tenant_slug,
  ST_Distance(t.ubicacion, ST_MakePoint($lng, $lat)::geography) AS distance_meters
FROM products p
JOIN tenants t ON p.tenant_id = t.id
WHERE ST_DWithin(t.ubicacion, ST_MakePoint($lng, $lat)::geography, $radio_metros)
  AND p.estado = 'ACTIVO'
  AND p.stock > 0
ORDER BY distance_meters ASC
LIMIT $limite;
```

## Verificar cobertura de domicilio

```sql
SELECT ST_DWithin(
  (SELECT ubicacion FROM tenants WHERE id = $tenant_id),
  ST_MakePoint($lng, $lat)::geography,
  (SELECT radio_cobertura_km * 1000 FROM delivery_config WHERE tenant_id = $tenant_id)
) AS en_cobertura;
```

## Calcular distancia entre comercio y cliente

```sql
SELECT ST_Distance(
  (SELECT ubicacion FROM tenants WHERE id = $tenant_id),
  (SELECT ubicacion FROM orders WHERE id = $order_id)
) AS distancia_metros;
```

## Encontrar sucursal más cercana con stock

```sql
SELECT b.id, b.nombre,
  ST_Distance(b.ubicacion, ST_MakePoint($lng, $lat)::geography) AS distance_meters
FROM tenant_branches b
JOIN product_stock_by_branch psb ON b.id = psb.branch_id
WHERE psb.product_id = $product_id
  AND psb.stock > 0
  AND b.estado = 'ACTIVA'
ORDER BY distance_meters ASC
LIMIT 1;
```

---

# INTEGRACIÓN CON PRISMA

## Schema Prisma

```prisma
model Tenant {
  id        String   @id @default(uuid())
  nombre    String
  // ... otros campos
  latitud   Float?
  longitud  Float?
  // Campo virtual para PostGIS (no en Prisma, se accede via raw query)
  
  @@map("tenants")
}
```

## Repositorio con raw queries

```typescript
@Injectable()
export class GeoRepository {
  constructor(private prisma: PrismaService) {}

  async findTenantsNearby(lat: number, lng: number, radiusMeters: number, limit = 20) {
    return this.prisma.$queryRaw<GeoTenant[]>`
      SELECT id, nombre, slug, latitud, longitud,
        ST_Distance(ubicacion, ST_MakePoint(${lng}, ${lat})::geography) AS distance_meters
      FROM tenants
      WHERE ST_DWithin(ubicacion, ST_MakePoint(${lng}, ${lat})::geography, ${radiusMeters})
        AND estado = 'ACTIVO'
      ORDER BY distance_meters ASC
      LIMIT ${limit};
    `;
  }
}
```

---

# INTEGRACIÓN CON LEAFLET (FRONTEND)

## Instalación

```bash
npm install leaflet react-leaflet
```

## Componente base

```tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export function BusinessMap({ businesses, center }: Props) {
  return (
    <MapContainer center={center} zoom={14} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {businesses.map(b => (
        <Marker key={b.id} position={[b.latitud, b.longitud]}>
          <Popup>
            <strong>{b.nombre}</strong><br />
            {b.direccion}<br />
            <a href={`/negocio/${b.slug}`}>Ver más</a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
```

## Selección de ubicación (cliente)

```tsx
import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';

function LocationSelector({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<[number, number] | null>(null);

  function ClickHandler() {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
        onSelect(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  return (
    <MapContainer center={[1.1492, -76.6466]} zoom={14} style={{ height: '400px' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler />
      {position && <Marker position={position} />}
    </MapContainer>
  );
}
```

---

# GEOLOCALIZACIÓN DEL CLIENTE

## Pedir permiso

```typescript
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      onLocation(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      console.warn('Permiso denegado o error:', err);
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
}
```

## Fallbacks

Si no hay permiso:

- Pedir dirección manual.
- Permitir seleccionar en mapa.

Detalle: [[DOMICILIOS.md]].

---

# RUTAS DE ENTREGA

## Generación (futuro)

Integración con OSRM o GraphHopper (self-hosted) para calcular ruta óptima.

Para MVP: el domiciliario abre Google Maps o Waze con la dirección.

```typescript
function generarRuta(origen: LatLng, destino: LatLng) {
  return {
    googleMaps: `https://www.google.com/maps/dir/${origen.lat},${origen.lng}/${destino.lat},${destino.lng}`,
    waze: `https://waze.com/ul?ll=${destino.lat},${destino.lng}&navigate=yes`,
  };
}
```

## Tracking en tiempo real (fase futura)

- Domiciliario envía GPS cada N segundos.
- Backend almacena última posición.
- Cliente ve mapa con posición del domiciliario.
- WebSocket para push en tiempo real.

Detalle: [[WEBSOCKETS.md]].

---

# CÁLCULO DE DISTANCIA DE DOMICILIO

## Costo por distancia

Configurable por tenant:

```typescript
{
  costoBase: 4000,  // COP
  costoPorKm: 500,  // COP por km adicional
  distanciaGratisKm: 1,  // hasta 1km sin costo extra
}
```

## Cálculo

```typescript
function calcularCostoDomicilio(
  distanciaMetros: number,
  config: DeliveryConfig,
): number {
  const km = distanciaMetros / 1000;
  if (km <= config.distanciaGratisKm) return config.costoBase;
  const kmAdicional = km - config.distanciaGratisKm;
  return config.costoBase + Math.ceil(kmAdicional) * config.costoPorKm;
}
```

## Tiempo estimado (básico)

Velocidad promedio en ciudad: 20 km/h.

```typescript
function tiempoEstimadoMin(distanciaMetros: number): number {
  const km = distanciaMetros / 1000;
  const horas = km / 20;
  return Math.ceil(horas * 60) + 10; // +10 min preparación
}
```

Fase 2: cálculo real con API de routing.

---

# VALIDACIONES

## Coordenadas válidas

```typescript
function validarCoordenadas(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
```

## En cobertura

Antes de confirmar pedido:

```sql
SELECT ST_DWithin(
  (SELECT ubicacion FROM tenants WHERE id = $tenant_id),
  ST_MakePoint($lng, $lat)::geography,
  $radio_metros
);
```

Si false, rechazar con `COVERAGE_OUT_OF_RANGE`.

---

# ÍNDICES

Toda columna geografía debe tener índice GIST.

```sql
CREATE INDEX idx_tenants_ubicacion ON tenants USING GIST (ubicacion);
CREATE INDEX idx_customers_ubicacion ON customers USING GIST (ubicacion);
CREATE INDEX idx_orders_ubicacion ON orders USING GIST (ubicacion);
```

Verificar con:

```sql
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public';
```

---

# PRIVACIDAD

## Datos de ubicación del cliente

- Almacenar solo cuando el cliente lo comparte explícitamente.
- Mostrar al cliente qué se almacena.
- Permitir eliminar desde su perfil.
- Cumplir Ley 1581/2012.

## Datos de tracking (futuro)

- Almacenar historial limitado (último punto + ruta).
- Retención: 30 días después de la entrega.
- Cifrado en tránsito (HTTPS).

---

# PERFORMANCE

## Cache de consultas geográficas

- Resultado de "cercanos a X" cachear en Redis 1-5 min.
- Invalidar al cambiar ubicación de un tenant.
- Cachear por `tenant` + `categoría` + `radio`.

Detalle: [[CACHE.md]].

## Límites de consultas

- Máximo 20 resultados por query.
- Máximo 50km de radio.
- Rate limit por IP (mercado público).

---

# EVENTOS RELACIONADOS

- `ubicacion.compartida`
- `ruta.solicitada`
- `cobertura.verificada`
- `cobertura.fuera`
- `distancia.calculada`

Detalle: [[EVENTOS.md]].

---

# AUDITORÍA

- `LOCATION_SHARED` (cliente)
- `LOCATION_UPDATED` (admin)
- `COVERAGE_CHECKED`

Detalle: [[AUDITORIA.md]].

---

# REGLAS CRÍTICAS

- Toda columna geografía con índice GIST.
- Toda consulta espacial con `ST_DWithin` antes de `ST_Distance` (filtrar primero).
- Coordenadas validadas antes de almacenar.
- Cliente siempre debe poder eliminar su ubicación.
- Pedido siempre valida cobertura antes de confirmar.
- Radio máximo de búsqueda 50km.
- Cache de consultas geográficas para no saturar DB.
- OpenStreetMap: respetar rate limit (~1 carga/seg por IP para tiles).
- Migración inicial: poblar `ubicacion` desde `latitud`/`longitud` existentes.
