// file: /components/shared/Footer.tsx
// feature: Framework - Responsive footer component

import AppVersion from '@/components/app/Version';
import CopyrightNotice from '@/components/shared/CopyrightNotice';
import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

interface FooterProps extends HTMLAttributes<HTMLElement> {
  align?: 'left' | 'center' | 'right';
}

export default function Footer({ 
  align = 'center',
  className,
  ...props 
}: FooterProps) {
  return (
    <footer
      className={cn(
        "bg-background text-muted-foreground py-4 relative z-30 border-t",
        className
      )}
      {...props}
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div className="mb-2 sm:mb-0 order-2 sm:order-1">
            <AppVersion />
          </div>
          <div className="order-1 sm:order-2">
            <CopyrightNotice align={align} />
          </div>
        </div>
      </div>
    </footer>
  );
}