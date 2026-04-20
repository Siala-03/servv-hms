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
  emerald: 'bg-gradient-to-br from-emerald-50 to-emerald-100/70 text-emerald-700 border-emerald-200/70',
  amber: 'bg-gradient-to-br from-amber-50 to-amber-100/70 text-amber-700 border-amber-200/70',
  red: 'bg-gradient-to-br from-red-50 to-red-100/70 text-red-700 border-red-200/70',
  purple: 'bg-gradient-to-br from-purple-50 to-purple-100/70 text-purple-700 border-purple-200/70'
};
export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = 'amber'
}: StatsCardProps) {
  return (
    <div className="luxury-panel rounded-2xl p-6 transition-all duration-250 hover:-translate-y-0.5 hover:shadow-[0_18px_35px_-26px_rgba(15,23,42,0.65)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[0.78rem] font-semibold text-slate-500 mb-1 uppercase tracking-[0.11em]">{title}</p>
          <h3 className="text-3xl font-semibold text-slate-900 leading-none tracking-[-0.01em]">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl border shadow-inner ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend !== undefined &&
      <div className="mt-5 flex items-center gap-2.5">
          <div
          className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${trend >= 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
          
            {trend >= 0 ?
          <TrendingUp className="w-4 h-4 mr-1" /> :

          <TrendingDown className="w-4 h-4 mr-1" />
          }
            {Math.abs(trend)}%
          </div>
          {trendLabel &&
        <span className="text-sm text-slate-500">{trendLabel}</span>
        }
        </div>
      }
    </div>);

}