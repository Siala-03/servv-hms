import React from 'react';
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-8">
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400 font-semibold">Servv Smart Hospitality</p>
        <h1 className="text-[1.9rem] leading-[1.1] font-semibold tracking-[-0.02em] headline-accent">{title}</h1>
        {subtitle &&
        <p className="text-sm text-slate-500 mt-1 max-w-2xl tracking-[0.01em]">
            {subtitle}
          </p>
        }
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end p-2 rounded-xl bg-white/70 border border-slate-200/80 shadow-sm backdrop-blur-sm">
          {actions}
        </div>
      )}
    </div>);

}