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
  teal: 'bg-teal-500/12 text-teal-700 ring-1 ring-teal-500/15 dark:text-teal-300',
  blue: 'bg-sky-500/12 text-sky-700 ring-1 ring-sky-500/15 dark:text-sky-300',
  orange: 'bg-amber-500/14 text-amber-700 ring-1 ring-amber-500/15 dark:text-amber-300',
  red: 'bg-rose-500/12 text-rose-700 ring-1 ring-rose-500/15 dark:text-rose-300',
  purple: 'bg-violet-500/12 text-violet-700 ring-1 ring-violet-500/15 dark:text-violet-300',
  pink: 'bg-pink-500/12 text-pink-700 ring-1 ring-pink-500/15 dark:text-pink-300',
};

function getIconStyle(index: number): string {
  const colors = ['teal', 'blue', 'orange', 'red', 'purple', 'pink'];
  return iconBg[colors[index % colors.length]];
}

export function StatCard({ title, value, icon: Icon, trend, trendValue, description, className }: StatCardProps) {
  return (
    <div className={cn(
      'admin-card-soft group relative overflow-hidden rounded-xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25',
      className,
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {(trend || trendValue) && (
            <div className="flex items-center gap-1.5">
              {trend === 'up' && <TrendingUp className="size-3.5 text-green-500" />}
              {trend === 'down' && <TrendingDown className="size-3.5 text-red-500" />}
              {trend === 'neutral' && <Minus className="size-3.5 text-muted-foreground" />}
              {trendValue && <span className={cn('text-xs font-medium', trend === 'up' ? 'text-green-600 dark:text-green-400' : trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>{trendValue}</span>}
            </div>
          )}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {Icon && (
          <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105', getIconStyle(title.length))}>
            <Icon className="size-5" />
          </div>
        )}
      </div>
    </div>
  );
}
