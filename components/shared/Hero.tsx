// file: /components/shared/Hero.tsx
// feature: Framework - Reusable hero section component

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { HTMLAttributes } from "react";

interface HeroProps extends HTMLAttributes<HTMLElement> {
  primaryText: string;
  message?: string | null;
  actionButtonText?: string | null;
  actionButtonUrl?: string | null;
  align?: 'left' | 'center' | 'right';
  animate?: boolean;
  variant?: 'default' | 'minimal';
}

export function Hero({
  primaryText,
  message = null,
  actionButtonText = null,
  actionButtonUrl = null,
  align = 'center',
  animate = true,
  variant = 'default',
  className,
  ...props
}: HeroProps) {
  return (
    <section
      className={cn(
        "space-y-6 mb-16",
        {
          'text-left': align === 'left',
          'text-center': align === 'center',
          'text-right': align === 'right',
        },
        animate && "animate-in fade-in duration-1000",
        className
      )}
      {...props}
    >
      <h1 
        className={cn(
          "text-4xl md:text-6xl font-bold tracking-tighter",
          animate && "animate-in slide-in-from-top duration-500"
        )}
      >
        {primaryText}
      </h1>

      {message && (
        <p 
          className={cn(
            "text-xl text-muted-foreground",
            align === 'center' && "max-w-2xl mx-auto",
            animate && "animate-in fade-in slide-in-from-bottom duration-700 delay-200"
          )}
        >
          {message}
        </p>
      )}

      {actionButtonText && actionButtonUrl && (
        <div 
          className={cn(
            "flex gap-4 mt-8",
            {
              'justify-start': align === 'left',
              'justify-center': align === 'center',
              'justify-end': align === 'right'
            },
            animate && "animate-in fade-in slide-in-from-bottom duration-1000 delay-300"
          )}
        >
          <Link href={actionButtonUrl}>
            <Button 
              size="lg" 
              className={cn(
                variant === 'minimal' && "bg-background text-foreground border hover:bg-muted"
              )}
            >
              {actionButtonText}
            </Button>
          </Link>
        </div>
      )}
    </section>
  );
}