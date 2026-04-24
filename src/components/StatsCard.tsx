import React from 'react';
import { TrendingUp, TrendingDown, BoxIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: BoxIcon;
  trend?: number;
  trendLabel?: string;
  color?: 'amber' | 'emerald' | 'red' | 'purple';
}

const colorMap = {
  amber:   { icon: 'text-amber-600',   bg: 'bg-amber-50   border-amber-100' },
  emerald: { icon: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
  red:     { icon: 'text-rose-600',    bg: 'bg-rose-50    border-rose-100' },
  purple:  { icon: 'text-violet-600',  bg: 'bg-violet-50  border-violet-100' },
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = 'amber',
}: StatsCardProps) {
  const c = colorMap[color];
  const trendWidth = trend !== undefined ? Math.min(Math.max(Math.abs(trend) * 6, 12), 84) : 0;

  return (
    <div className="luxury-panel rounded-xl p-5 transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">{title}</p>
        <div className={`p-1.5 rounded-lg border ${c.bg}`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
      </div>

      <p className="text-[26px] font-semibold text-zinc-900 tracking-[-0.02em] leading-none">{value}</p>

      {trend !== undefined && (
        <div className="mt-3.5">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                trend >= 0
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-rose-700 bg-rose-50'
              }`}
            >
              {trend >= 0
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />
              }
              {Math.abs(trend)}%
            </span>
            {trendLabel && (
              <span className="text-[11px] text-zinc-400">{trendLabel}</span>
            )}
          </div>
          <div className="mt-2.5 h-1 w-full rounded-full bg-zinc-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${trend >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
              style={{ width: `${trendWidth}px` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
