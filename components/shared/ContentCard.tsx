// file: /components/shared/ContentCard.tsx
// feature: Framework - Enhanced content card building block

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface ContentCardProps extends HTMLAttributes<HTMLDivElement> {
  cardTitle?: string | null;
  footerText?: string | null;
  align?: 'left' | 'center' | 'right';
  variant?: 'default' | 'bordered';
  animate?: boolean;
}

export function ContentCard({
  cardTitle = null,
  footerText = null,
  align = 'center',
  variant = 'default',
  animate = true,
  className,
  children,
  ...props
}: ContentCardProps) {
  return (
    <Card
      className={cn(
        "w-full overflow-hidden",
        animate && "animate-fade-in hover:animate-pulse",
        {
          'text-left': align === 'left',
          'text-center': align === 'center',
          'text-right': align === 'right',
          'border': variant === 'bordered',
          'transform transition-all duration-200 hover:shadow-lg': animate
        },
        className
      )}
      {...props}
    >
      {cardTitle && ( 
        <CardHeader className={cn(
          "border-b bg-muted/50 px-4 py-3 md:px-6",
          animate && "animate-slide-in-from-top"
        )}>
          <h2 className="text-lg font-bold tracking-tight text-primary sm:text-xl md:text-2xl">
            {cardTitle} 
          </h2>
        </CardHeader>
      )}
      
      <CardContent className={cn(
        "p-4 md:p-6 lg:p-8",
        animate && "animate-fade-in-up delay-150"
      )}>
        {children}
      </CardContent>

      {footerText && (
        <CardFooter className={cn(
          "border-t bg-muted/30 px-4 py-3 md:px-6 w-full",
          animate && "animate-slide-in-from-bottom",
          {
            'flex justify-start': align === 'left',
            'flex justify-center': align === 'center', 
            'flex justify-end': align === 'right'
          }
        )}>
          <p className="text-sm text-muted-foreground">
            {footerText}
          </p>
        </CardFooter>
      )}
    </Card>
  );
}