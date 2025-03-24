// file: /components/shared/ContentSlider.tsx
// feature: UI - Flexible content slider component

"use client";

import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

interface ContentSliderProps {
  slides: React.ReactNode[];
  delay?: number;
  className?: string;
}

export function ContentSlider({ 
  slides, 
  delay = 5000, 
  className 
}: ContentSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, delay);

    return () => clearInterval(timer);
  }, [slides.length, delay]);

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative overflow-hidden w-full min-h-[160px]">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={cn(
              "absolute w-full transition-all duration-500 ease-in-out text-center",
              index === currentSlide 
                ? "opacity-100 translate-x-0 animate-fade-in-up" 
                : "opacity-0 translate-x-full"
            )}
          >
            {slide}
          </div>
        ))}
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center mt-4 space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              currentSlide === index ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>
    </div>
  );
}