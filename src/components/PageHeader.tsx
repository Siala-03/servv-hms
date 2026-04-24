import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-7">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold text-zinc-900 tracking-[-0.02em] leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-zinc-500 mt-1 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
