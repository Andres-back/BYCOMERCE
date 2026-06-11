'use client';

import { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';

interface AdminPageLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function AdminPageLayout({ title, description, children, actions }: AdminPageLayoutProps) {
  return (
    <div className="space-y-5">
      <Breadcrumbs />
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[1.65rem]">{title}</h1>
          {description && <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
