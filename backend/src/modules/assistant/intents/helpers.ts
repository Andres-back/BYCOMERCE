import { EstadoGeneral } from '../../../database/prisma-client';

export function formatCentavosToCop(centavos: number): string {
  const pesos = centavos / 100;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(pesos);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-CO').format(n);
}

export function getPeriodRange(period: string | undefined, now: Date = new Date()): { start: Date; end: Date; label: string } {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'HOY':
      return { start, end, label: 'hoy' };
    case 'AYER': {
      const y = new Date(start);
      y.setDate(y.getDate() - 1);
      const yEnd = new Date(end);
      yEnd.setDate(yEnd.getDate() - 1);
      return { start: y, end: yEnd, label: 'ayer' };
    }
    case 'SEMANA_ACTUAL': {
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1; // lunes como inicio
      const s = new Date(start);
      s.setDate(s.getDate() - diff);
      return { start: s, end, label: 'esta semana' };
    }
    case 'MES_ACTUAL': {
      const s = new Date(start.getFullYear(), start.getMonth(), 1);
      return { start: s, end, label: 'este mes' };
    }
    case 'ANIO_ACTUAL': {
      const s = new Date(start.getFullYear(), 0, 1);
      return { start: s, end, label: 'este año' };
    }
    default: {
      const m = period?.match(/^ULTIMOS_(\d+)_(DIAS|SEMANAS|MESES)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        const unit = m[2];
        const s = new Date(start);
        if (unit === 'DIAS') s.setDate(s.getDate() - (n - 1));
        else if (unit === 'SEMANAS') s.setDate(s.getDate() - (n * 7 - 1));
        else s.setMonth(s.getMonth() - n);
        return { start: s, end, label: `últimos ${n} ${unit.toLowerCase()}` };
      }
      return { start, end, label: 'hoy' };
    }
  }
}

export function isActiveEstado(estado: string | undefined): boolean {
  return estado === EstadoGeneral.ACTIVO;
}
