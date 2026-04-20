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
        <h1 className="text-[1.85rem] leading-[1.15] font-semibold text-slate-900 tracking-[-0.01em]">{title}</h1>
        {subtitle &&
        <p className="text-sm text-slate-500 mt-1 max-w-2xl tracking-[0.01em]">
            {subtitle}
          </p>
        }
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">{actions}</div>}
    </div>);

}