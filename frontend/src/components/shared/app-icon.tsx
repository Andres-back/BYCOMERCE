import Image from 'next/image';

const iconMap: Record<string, string> = {
  dashboard: 'dashboard.svg',
  customers: 'clientes.svg',
  clients: 'clientes.svg',
  clientes: 'clientes.svg',
  inventory: 'inventario.svg',
  purchases: 'compras.svg',
  compras: 'compras.svg',
  orders: 'pedidos.svg',
  pedidos: 'pedidos.svg',
  pos: 'punto-venta.svg',
  'punto-venta': 'punto-venta.svg',
  cash: 'caja.svg',
  caja: 'caja.svg',
  users: 'usuarios.svg',
  usuarios: 'usuarios.svg',
  plans: 'marketplace.svg',
  suscripcion: 'marketplace.svg',
  settings: 'ajustes.svg',
  ajustes: 'ajustes.svg',
  reports: 'reportes.svg',
  reportes: 'reportes.svg',
  notifications: 'notificaciones.svg',
  notificaciones: 'notificaciones.svg',
  delivery: 'domiciliarios.svg',
  domiciliarios: 'domiciliarios.svg',
  promotions: 'promociones.svg',
  promociones: 'promociones.svg',
  loyalty: 'fidelizacion.svg',
  fidelizacion: 'fidelizacion.svg',
  branches: 'sucursales.svg',
  sucursales: 'sucursales.svg',
  'delivery-route': 'ubicacion.svg',
  ruta: 'ubicacion.svg',
  superadmin: 'ajustes.svg',
  tenants: 'tienda.svg',
  audit: 'reportes.svg',
  auditoria: 'reportes.svg',
  store: 'tienda.svg',
  tienda: 'tienda.svg',
  login: 'login.svg',
  whatsapp: 'whatsapp.svg',
  producto: 'producto.svg',
  proveedores: 'proveedores.svg',
  suppliers: 'proveedores.svg',
  agotado: 'agotado.svg',
  'bajo-stock': 'bajo-stock.svg',
  confirmado: 'confirmado.svg',
  disponible: 'disponible.svg',
  entregado: 'entregado.svg',
  pendiente: 'pendiente.svg',
  ubicacion: 'ubicacion.svg',
};

interface AppIconProps {
  name: string;
  className?: string;
  size?: number;
}

export function AppIcon({ name, className = 'size-5', size }: AppIconProps) {
  const iconFile = iconMap[name.toLowerCase()] ?? 'tienda.svg';
  const dimension = size ?? 20;

  return (
    <Image
      src={`/icons/${iconFile}`}
      alt={name}
      width={dimension}
      height={dimension}
      className={className}
      unoptimized
    />
  );
}
