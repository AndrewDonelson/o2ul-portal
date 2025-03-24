// file: /components/shared/PageHeader.tsx
// feature: Framework - Responsive page header building block

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  align?: 'left' | 'center' | 'right';
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  align = 'center',
  className,
  children,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "w-full space-y-4 px-4 pb-4 md:px-6 lg:px-8",
        {
          'text-left': align === 'left',
          'text-center': align === 'center',
          'text-right': align === 'right'
        },
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground sm:text-base md:text-lg">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}