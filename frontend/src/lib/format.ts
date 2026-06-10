export function formatCop(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCopCentavos(value: number): string {
  return formatCop(value / 100);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes}m`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days}d`;
  return formatDate(d);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CO').format(value);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function availabilityLabel(product: { stock: number; stockMinimo: number }): string {
  if (product.stock <= 0) return 'Agotado';
  if (product.stock <= product.stockMinimo) return 'Pocas unidades';
  return 'Disponible';
}

export function availabilityVariant(product: { stock: number; stockMinimo: number }): 'destructive' | 'secondary' | 'default' {
  if (product.stock <= 0) return 'destructive';
  if (product.stock <= product.stockMinimo) return 'secondary';
  return 'default';
}

export type RoleName = 'SUPER_ADMIN' | 'ADMIN_NEGOCIO' | 'SUPERVISOR' | 'CAJERO' | 'DOMICILIARIO';

export const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_NEGOCIO: 'Admin',
  SUPERVISOR: 'Supervisor',
  CAJERO: 'Cajero',
  DOMICILIARIO: 'Domiciliario',
};

export const orderStatusLabels: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  EN_PREPARACION: 'Preparando',
  LISTA: 'Lista',
  EN_CAMINO: 'En camino',
  ENTREGADA: 'Entregada',
  CANCELADA: 'Cancelada',
  RECHAZADA: 'Rechazada',
};

export const orderStatusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDIENTE: 'secondary',
  CONFIRMADA: 'default',
  EN_PREPARACION: 'default',
  LISTA: 'default',
  EN_CAMINO: 'default',
  ENTREGADA: 'outline',
  CANCELADA: 'destructive',
  RECHAZADA: 'destructive',
};

export const paymentMethodLabels: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  TARJETA: 'Tarjeta',
  MIXTO: 'Mixto',
  CONTRA_ENTREGA: 'Contra entrega',
};