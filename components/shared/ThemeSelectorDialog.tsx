// file: /components/shared/ThemeSelectorDialog.tsx
// feature: Core - Theme selector dialog

import React, { useEffect, useState } from 'react';
import { Check } from "lucide-react";
import { useTheme } from "next-themes";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ThemePreviewColors {
  primary: string;
  secondary: string;
  accent: string;
}

// Theme preview colors - we'll use these regardless of app theme
const themePreviewColors: Record<string, ThemePreviewColors> = {
  default: {
    primary: '#000000',
    secondary: '#6B7280',
    accent: '#F0F0F0'
  },
  blue: {
    primary: '#2563EB',
    secondary: '#60A5FA',
    accent: '#DBEAFE'
  },
  brown: {
    primary: '#92400E',
    secondary: '#B45309',
    accent: '#FDE68A'
  },
  charcol: {
    primary: '#1F2937',
    secondary: '#4B5563',
    accent: '#9CA3AF'
  },
  cyan: {
    primary: '#0891B2',
    secondary: '#22D3EE',
    accent: '#CFFAFE'
  },
  emerald: {
    primary: '#059669',
    secondary: '#34D399',
    accent: '#D1FAE5'
  },
  flame: {
    primary: '#EA580C',
    secondary: '#FB923C',
    accent: '#FED7AA'
  },
  forrest: {
    primary: '#166534',
    secondary: '#22C55E',
    accent: '#BBF7D0'
  },
  gold: {
    primary: '#B45309',
    secondary: '#F59E0B',
    accent: '#FDE68A'
  },
  grape: {
    primary: '#7C3AED',
    secondary: '#A78BFA',
    accent: '#EDE9FE'
  },
  green: {
    primary: '#16A34A',
    secondary: '#4ADE80',
    accent: '#DCFCE7'
  },
  hotpink: {
    primary: '#DB2777',
    secondary: '#F472B6',
    accent: '#FCE7F3'
  },
  lime: {
    primary: '#65A30D',
    secondary: '#A3E635',
    accent: '#ECFCCB'
  },
  midnight: {
    primary: '#312E81',
    secondary: '#4338CA',
    accent: '#E0E7FF'
  },
  orange: {
    primary: '#EA580C',
    secondary: '#FB923C',
    accent: '#FFEDD5'
  },
  pink: {
    primary: '#DB2777',
    secondary: '#F472B6',
    accent: '#FCE7F3'
  },
  purple: {
    primary: '#7C3AED',
    secondary: '#A78BFA',
    accent: '#EDE9FE'
  },
  red: {
    primary: '#DC2626',
    secondary: '#F87171',
    accent: '#FEE2E2'
  },
  rose: {
    primary: '#E11D48',
    secondary: '#FB7185',
    accent: '#FFE4E6'
  },
  ruby: {
    primary: '#BE123C',
    secondary: '#E11D48',
    accent: '#FFE4E6'
  },
  sky: {
    primary: '#0284C7',
    secondary: '#38BDF8',
    accent: '#E0F2FE'
  },
  slate: {
    primary: '#334155',
    secondary: '#64748B',
    accent: '#F1F5F9'
  },
  'speed-yellow': {
    primary: '#CA8A04',
    secondary: '#FACC15',
    accent: '#FEF9C3'
  },
  teal: {
    primary: '#0D9488',
    secondary: '#2DD4BF',
    accent: '#CCFBF1'
  },
  yellow: {
    primary: '#CA8A04',
    secondary: '#FACC15',
    accent: '#FEF9C3'
  }
};

interface ThemeSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ThemeSelectorDialog: React.FC<ThemeSelectorDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { theme: currentTheme, setTheme, resolvedTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(currentTheme || "default");
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    if (open) {
      setSelectedTheme(currentTheme || "default");
    }
  }, [open, currentTheme]);

  const handleThemeChange = async (theme: string) => {
    setSelectedTheme(theme);
    
    // Store current theme selection without changing mode
    localStorage.setItem('selected-theme', theme);

    try {
      const response = await fetch(`/themes/${theme}.css`);
      const css = await response.text();
      
      const style = document.createElement('style');
      style.textContent = css;
      
      document.querySelectorAll('style[data-theme]').forEach(el => el.remove());
      
      style.setAttribute('data-theme', theme);
      document.head.appendChild(style);
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Theme</DialogTitle>
          <DialogDescription>
            Choose from our collection of themes to personalize your experience
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <RadioGroup
            value={selectedTheme}
            onValueChange={handleThemeChange}
            className="grid grid-cols-2 gap-4 md:grid-cols-3"
          >
            {Object.entries(themePreviewColors).map(([themeName, colors]) => (
                              <Label
                key={themeName}
                className={cn(
                  "relative flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground",
                  isDark ? "bg-zinc-950" : "bg-white",
                  selectedTheme === themeName && "border-primary"
                )}
              >
                <RadioGroupItem
                  value={themeName}
                  id={themeName}
                  className="sr-only"
                />
                <div className="flex flex-col gap-2 w-full">
                  <span className="text-center font-semibold capitalize mb-2">
                    {themeName.replace(/-/g, ' ')}
                  </span>
                  <div className="flex gap-2">
                    <div 
                      className="w-6 h-6 rounded-full" 
                      style={{ backgroundColor: colors.primary }}
                    />
                    <div 
                      className="w-6 h-6 rounded-full" 
                      style={{ backgroundColor: colors.secondary }}
                    />
                    <div 
                      className="w-6 h-6 rounded-full" 
                      style={{ backgroundColor: colors.accent }}
                    />
                  </div>
                </div>
                {selectedTheme === themeName && (
                  <Check className="absolute top-3 right-3 h-4 w-4" />
                )}
              </Label>
            ))}
          </RadioGroup>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ThemeSelectorDialog;