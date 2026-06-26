'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface RouteMapProps {
  business: { nombre: string; latitud: number | null; longitud: number | null };
  orders: Array<{
    id: string;
    customer: { nombre: string } | null;
    direccion: string;
    latitud: number | null;
    longitud: number | null;
  }>;
  onSelectOrder?: (id: string) => void;
}

delete (L.Icon.Default.prototype as typeof L.Icon.Default.prototype & { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function RouteMap({ business, orders, onSelectOrder }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([1.149, -76.647], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: ' OpenStreetMap',
    }).addTo(map);

    const bounds: L.LatLngBoundsExpression = [];
    const points: [number, number][] = [];

    if (business.latitud && business.longitud) {
      const bizIcon = L.divIcon({
        html: '<div style="background:#059669;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;border:2px solid white">M</div>',
        className: '',
        iconSize: [24, 24],
      });
      L.marker([business.latitud, business.longitud], { icon: bizIcon })
        .addTo(map)
        .bindPopup(`<b>${business.nombre}</b><br/>Origen`);
      bounds.push([business.latitud, business.longitud]);
      points.push([business.latitud, business.longitud]);
    }

    orders.forEach((order, i) => {
      if (order.latitud && order.longitud) {
        const numIcon = L.divIcon({
          html: `<div style="background:#dc2626;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;border:2px solid white">${i + 1}</div>`,
          className: '',
          iconSize: [24, 24],
        });
        const marker = L.marker([order.latitud, order.longitud], { icon: numIcon }).addTo(map);
        marker.bindPopup(`<b>#${i + 1}: ${order.customer?.nombre ?? 'Cliente'}</b><br/>${order.direccion}`);
        marker.on('click', () => onSelectOrder?.(order.id));
        bounds.push([order.latitud, order.longitud]);
        points.push([order.latitud, order.longitud]);
      }
    });

    if (points.length > 1) {
      L.polyline(points, { color: '#059669', weight: 3, opacity: 0.7 }).addTo(map);
    }

    if (bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50] });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [business, orders, onSelectOrder]);

  return <div ref={mapRef} className="h-[360px] w-full rounded-lg border lg:h-[420px]" />;
}
