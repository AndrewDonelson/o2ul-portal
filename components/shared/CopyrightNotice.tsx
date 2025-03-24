// file: /components/shared/CopyrightNotice.tsx
// feature: Framework - Responsive copyright notice component

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
import { APP_AUTHOR, APP_COPYRIGHT_YEAR_FROM } from "@/lib/constants";

interface CopyrightNoticeProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'left' | 'center' | 'right';
}

const CopyrightNotice = ({
  align = 'center',
  className,
  ...props
}: CopyrightNoticeProps) => {
  const currentYear = new Date().getFullYear();
  const yearDisplay = APP_COPYRIGHT_YEAR_FROM 
    ? `${APP_COPYRIGHT_YEAR_FROM}-${currentYear}`
    : currentYear;

  return (
    <div
      className={cn(
        "text-xs text-muted-foreground p-2",
        {
          'text-left': align === 'left',
          'text-center': align === 'center',
          'text-right': align === 'right'
        },
        className
      )}
      {...props}
    >
      &copy; {yearDisplay} {APP_AUTHOR}
    </div>
  );
};

export default CopyrightNotice;