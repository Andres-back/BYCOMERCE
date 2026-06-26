'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bike, MapPin, Package, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layouts/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { useAuth } from '@/hooks/use-auth';
import { getDeliveryRoute } from '@/services/orders/orders.service';
import { formatCopCentavos } from '@/lib/format';
import dynamic from 'next/dynamic';

const RouteMap = dynamic(() => import('./route-map'), { ssr: false });

export default function RouteClient() {
  const { token, role } = useAuth();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['delivery-route'],
    queryFn: () => getDeliveryRoute(token!),
    enabled: !!token,
  });

  return (
    <div className={role === 'DOMICILIARIO' ? 'space-y-4 text-sm' : 'space-y-6'}>
      <PageHeader
        title="Ruta de entrega"
        description={role === 'DOMICILIARIO' ? 'Tu ruta asignada para hoy' : 'Órdenes en ruta'}
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="size-4 mr-1" /> Volver
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
          <div className="h-[380px] bg-muted animate-pulse rounded-lg" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No se pudo cargar la ruta de entrega.
          </CardContent>
        </Card>
      ) : !data || data.orders.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Bike className="mx-auto size-8 mb-2 opacity-50" />
            <p>No hay órdenes en ruta.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard title="Paradas" value={data.totalOrders} icon={MapPin} />
            <StatCard title="Distancia total" value={`${data.totalDistancia} km`} icon={Bike} />
            <StatCard title="Origen" value={data.business.nombre} icon={Package} />
          </div>

          <RouteMap
            business={data.business}
            orders={data.orders}
            onSelectOrder={(id) => router.push(`/admin/orders`)}
          />

          <div className="space-y-2">
            <h3 className="text-base font-semibold">Paradas</h3>
            {data.orders.map((order, i) => (
              <Card key={order.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      <div className="flex size-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-medium truncate">{order.customer?.nombre ?? 'Cliente'}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">{order.direccion}</span>
                        </div>
                        {order.customer?.telefono && (
                          <a
                            href={`https://wa.me/${order.customer.telefono.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <Phone className="size-3" /> {order.customer.telefono}
                          </a>
                        )}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {order.items.map((item, j) => (
                            <Badge key={j} variant="secondary" className="text-xs">
                              {item.product.nombre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="font-semibold text-sm">{formatCopCentavos(order.total)}</span>
                      <span className="text-xs text-muted-foreground">{order.distanciaKm} km</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
