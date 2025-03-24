// file: /components/shared/TagLine.tsx
// feature: UI - Animated tagline component
// module: Client
// License: MIT
// Author: Andrew Donelson
// Copyright 2025 Andrew Donelson

interface TagLineProps {
  className?: string;
}

export default function TagLine({ className }: TagLineProps) {
  return (
    <div className={`w-full text-center space-y-2 ${className}`}>
      {/* Main tagline with scale animation */}
      <h3 className="text-2xl md:text-3xl font-bold animate-scale-in">
        Global Stability, Decentralized Freedom
      </h3>

      {/* Decorative elements with bounce animations */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xl animate-bounce">✨</span>
        <span className="text-sm text-muted-foreground font-medium animate-fade-in-up">
          where AI meets blockchain for humanity's prosperity
        </span>
        <span className="text-xl animate-bounce-left">✨</span>
      </div>
    </div>
  );
}