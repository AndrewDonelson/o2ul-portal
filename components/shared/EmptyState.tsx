// file: /components/shared/EmptyState.tsx
// feature: Empty state component

import React from 'react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { 
  SearchX, 
  FileQuestion, 
  Inbox, 
  AlertCircle,
  ArrowRight,
  Plus
} from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

export interface EmptyStateProps {
  title: string;
  description?: string;
  search?: boolean;
  buttonText?: string;
  buttonLink?: string;
  isLoading?: boolean;
  icon?: 'search' | 'file' | 'inbox' | 'alert';
  className?: string;
  iconClassName?: string;
}

const EmptyState = ({ 
  title, 
  description, 
  search = false, 
  buttonLink, 
  buttonText,
  isLoading = false,
  icon = 'inbox',
  className,
  iconClassName
}: EmptyStateProps) => {
  // Check if button should be displayed
  const showButton = buttonLink && buttonLink.length > 0 && buttonText && buttonText.length > 0;
  
  // Map icon options to Lucide components
  const iconMap = {
    search: <SearchX className={cn("h-16 w-16", iconClassName)} />,
    file: <FileQuestion className={cn("h-16 w-16", iconClassName)} />,
    inbox: <Inbox className={cn("h-16 w-16", iconClassName)} />,
    alert: <AlertCircle className={cn("h-16 w-16", iconClassName)} />
  };

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center w-full p-6 text-center space-y-6 animate-fade-in",
        className
      )}>
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="space-y-3 w-full max-w-xs">
          <Skeleton className="h-5 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-4/5 mx-auto" />
          <Skeleton className="h-4 w-2/3 mx-auto" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center w-full p-6 text-center space-y-6",
      className
    )}>
      {/* Icon with decorative background */}
      <div className="relative animate-fade-in-down">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl animate-blob opacity-70"></div>
        <div className="relative bg-background/80 backdrop-blur-sm rounded-full p-6 border border-border text-primary">
          {iconMap[icon]}
        </div>
      </div>

      {/* Text content */}
      <div className="space-y-2 max-w-sm animate-fade-in-up">
        <h3 className="text-xl font-semibold">{title}</h3>
        
        {search && (
          <p className="text-sm text-muted-foreground">
            Try adjusting your search to find what you are looking for
          </p>
        )}
        
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {/* Action button */}
      {showButton && (
        <div className="animate-fade-in-up animation-delay-300">
          <Button 
            asChild 
            className="group transition-all duration-300 hover:shadow-md"
            size="lg"
          >
            <Link href={buttonLink} className="flex items-center gap-2">
              <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
              <span>{buttonText}</span>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;