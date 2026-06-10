import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  description?: string;
  className?: string;
}

const iconBg: Record<string, string> = {
  teal: 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/20',
  blue: 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/20',
  orange: 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20',
  red: 'bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/20',
  purple: 'bg-gradient-to-br from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/20',
  pink: 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/20',
};

function getIconStyle(index: number): string {
  const colors = ['teal', 'blue', 'orange', 'red', 'purple', 'pink'];
  return iconBg[colors[index % colors.length]];
}

export function StatCard({ title, value, icon: Icon, trend, trendValue, description, className }: StatCardProps) {
  return (
    <div className={cn(
      'group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5',
      className,
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-gray-900">{value}</p>
          {(trend || trendValue) && (
            <div className="flex items-center gap-1.5">
              {trend === 'up' && <TrendingUp className="size-3.5 text-green-500" />}
              {trend === 'down' && <TrendingDown className="size-3.5 text-red-500" />}
              {trend === 'neutral' && <Minus className="size-3.5 text-gray-400" />}
              {trendValue && <span className={cn('text-xs font-medium', trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500')}>{trendValue}</span>}
            </div>
          )}
          {description && <p className="text-xs text-gray-400">{description}</p>}
        </div>
        {Icon && (
          <div className={cn('flex size-11 items-center justify-center rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110', getIconStyle(title.length))}>
            <Icon className="size-5" />
          </div>
        )}
      </div>
    </div>
  );
}
