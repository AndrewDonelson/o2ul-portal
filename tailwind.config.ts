// file: /tailwind.config.ts
// feature: Config - Organized Tailwind configuration with grouped animations

import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
        '3xl': '2048px',
        '4xl': '3840px',
        '5xl': '7680px'
      }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        // Slide animations
        'slide-in-right': {
          '0%': {
            transform: 'translateX(100%)',
            opacity: '0'
          },
          '100%': {
            transform: 'translateX(0)',
            opacity: '1'
          }
        },
        'slide-in-left': {
          '0%': {
            transform: 'translateX(-100%)',
            opacity: '0'
          },
          '100%': {
            transform: 'translateX(0)',
            opacity: '1'
          }
        },
        'slide-in-top': {
          '0%': {
            transform: 'translateY(-100%)',
            opacity: '0'
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1'
          }
        },
        'slide-in-bottom': {
          '0%': {
            transform: 'translateY(100%)',
            opacity: '0'
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1'
          }
        },
        'slide-out-right': {
          '0%': {
            transform: 'translateX(0)',
            opacity: '1'
          },
          '100%': {
            transform: 'translateX(100%)',
            opacity: '0'
          }
        },
        'slide-out-left': {
          '0%': {
            transform: 'translateX(0)',
            opacity: '1'
          },
          '100%': {
            transform: 'translateX(-100%)',
            opacity: '0'
          }
        },
        'slide-out-top': {
          '0%': {
            transform: 'translateY(0)',
            opacity: '1'
          },
          '100%': {
            transform: 'translateY(-100%)',
            opacity: '0'
          }
        },
        'slide-out-bottom': {
          '0%': {
            transform: 'translateY(0)',
            opacity: '1'
          },
          '100%': {
            transform: 'translateY(100%)',
            opacity: '0'
          }
        },
        
        // Fade animations
        'fade-in': {
          '0%': {
            opacity: '0'
          },
          '100%': {
            opacity: '1'
          }
        },
        'fade-out': {
          '0%': {
            opacity: '1'
          },
          '100%': {
            opacity: '0'
          }
        },
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'fade-in-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'fade-in-left': {
          '0%': {
            opacity: '0',
            transform: 'translateX(-10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)'
          }
        },
        'fade-in-right': {
          '0%': {
            opacity: '0',
            transform: 'translateX(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)'
          }
        },
        
        // Scale animations
        'scale-in': {
          '0%': {
            transform: 'scale(0.5)',
            opacity: '0'
          },
          '100%': {
            transform: 'scale(1)',
            opacity: '1'
          }
        },
        'scale-out': {
          '0%': {
            transform: 'scale(1)',
            opacity: '1'
          },
          '100%': {
            transform: 'scale(0.5)',
            opacity: '0'
          }
        },
        'pop-in': {
          '0%': { 
            transform: 'scale(0)',
            opacity: '0'
          },
          '70%': { 
            transform: 'scale(1.1)',
            opacity: '1'
          },
          '100%': { 
            transform: 'scale(1)',
            opacity: '1'
          }
        },
        
        // Rotate animations
        'rotate-in': {
          '0%': {
            transform: 'rotate(-180deg)',
            opacity: '0'
          },
          '100%': {
            transform: 'rotate(0)',
            opacity: '1'
          }
        },
        'rotate-out': {
          '0%': {
            transform: 'rotate(0)',
            opacity: '1'
          },
          '100%': {
            transform: 'rotate(180deg)',
            opacity: '0'
          }
        },
        'spin-slow': {
          '0%': { 
            transform: 'rotate(0deg)' 
          },
          '100%': { 
            transform: 'rotate(360deg)' 
          }
        },
        'reverse-spin': {
          '0%': { 
            transform: 'rotate(0deg)' 
          },
          '100%': { 
            transform: 'rotate(-360deg)' 
          }
        },
        'spin-slow-extra': {
          '0%': { 
            transform: 'rotate(0deg)' 
          },
          '100%': { 
            transform: 'rotate(720deg)' 
          }
        },
        
        // Bounce/Pulse animations
        'bounce': {
          '0%, 100%': {
            transform: 'translateY(0)'
          },
          '50%': {
            transform: 'translateY(-5px)'
          }
        },
        'bounce-left': {
          '0%, 100%': {
            transform: 'translateX(0)'
          },
          '50%': {
            transform: 'translateX(-5px)'
          }
        },
        'bounce-right': {
          '0%, 100%': {
            transform: 'translateX(0)'
          },
          '50%': {
            transform: 'translateX(5px)'
          }
        },
        'bounce-slow': {
          "0%, 100%": {
            transform: "translateY(0)"
          },
          "50%": {
            transform: "translateY(-10px)"
          }
        },
        'pulse': {
          '0%, 100%': {
            opacity: '1'
          },
          '50%': {
            opacity: '0.5'
          }
        },
        'pulse-slow': {
          '0%, 100%': { 
            opacity: '1', 
            transform: 'scale(1)' 
          },
          '50%': { 
            opacity: '0.9', 
            transform: 'scale(0.95)' 
          }
        },
        
        // Special effect animations
        'blob': {
          '0%': {
            transform: 'translate(0px, 0px) scale(1)'
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)'
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)'
          },
          '100%': {
            transform: 'translate(0px, 0px) scale(1)'
          }
        },
        'marquee': {
          '0%': {
            transform: 'translateX(100%)'
          },
          '100%': {
            transform: 'translateX(-100%)'
          }
        },
        'wiggle': {
          '0%, 100%': {
            transform: 'rotate(-3deg)'
          },
          '50%': {
            transform: 'rotate(3deg)'
          }
        },
        'float': {
          '0%': { 
            transform: 'translateY(0px)' 
          },
          '50%': { 
            transform: 'translateY(-5px)' 
          },
          '100%': { 
            transform: 'translateY(0px)' 
          }
        },
        'glow': {
          "0%": { 
            opacity: '0.6', 
            textShadow: "0 0 10px currentColor" 
          },
          "100%": { 
            opacity: '1', 
            textShadow: "0 0 20px currentColor, 0 0 30px currentColor" 
          },
        },
        'wave': {
          "0%, 100%": { 
            transform: "translateY(0)" 
          },
          "50%": { 
            transform: "translateY(-10px)" 
          }
        },
        'shimmer': {
          "0%": { 
            backgroundPosition: "-200% 0" 
          },
          "100%": { 
            backgroundPosition: "200% 0" 
          }
        },
        
        // Radix UI specific animations
        'accordion-down': {
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        },
      },
      animation: {
        // Slide animations
        'slide-in-right': 'slide-in-right 0.5s ease-out',
        'slide-in-left': 'slide-in-left 0.5s ease-out',
        'slide-in-top': 'slide-in-top 0.5s ease-out',
        'slide-in-bottom': 'slide-in-bottom 0.5s ease-out',
        'slide-out-right': 'slide-out-right 0.5s ease-out',
        'slide-out-left': 'slide-out-left 0.5s ease-out',
        'slide-out-top': 'slide-out-top 0.5s ease-out',
        'slide-out-bottom': 'slide-out-bottom 0.5s ease-out',
        
        // Fade animations
        'fade-in': 'fade-in 0.5s ease-out',
        'fade-out': 'fade-out 0.5s ease-out',
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'fade-in-down': 'fade-in-down 0.5s ease-out',
        'fade-in-left': 'fade-in-left 0.5s ease-out',
        'fade-in-right': 'fade-in-right 0.5s ease-out',
        
        // Scale animations
        'scale-in': 'scale-in 0.5s ease-out',
        'scale-out': 'scale-out 0.5s ease-out',
        'pop-in': 'pop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        
        // Rotate animations
        'rotate-in': 'rotate-in 0.5s ease-out',
        'rotate-out': 'rotate-out 0.5s ease-out',
        'spin-slow': 'spin-slow 15s linear infinite',
        'reverse-spin': 'reverse-spin 20s linear infinite',
        'spin-slow-extra': 'spin-slow-extra 30s linear infinite',
        
        // Bounce/Pulse animations
        'bounce': 'bounce 1s infinite',
        'bounce-left': 'bounce-left 1s infinite',
        'bounce-right': 'bounce-right 1s infinite',
        'bounce-slow': 'bounce-slow 2s infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        
        // Special effect animations
        'blob': 'blob 7s infinite',
        'marquee': 'marquee 20s linear infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'wave': 'wave 1.5s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        
        // Radix UI specific animations
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      screens: {
        '3xl': '2048px',
        '4xl': '3840px',
        '5xl': '7680px'
      },
      gridTemplateColumns: {
        '1': 'repeat(1, minmax(0, 1fr))',
        '2': 'repeat(2, minmax(0, 1fr))',
        '3': 'repeat(3, minmax(0, 1fr))',
        '4': 'repeat(4, minmax(0, 1fr))',
        '5': 'repeat(5, minmax(0, 1fr))',
        '6': 'repeat(6, minmax(0, 1fr))',
        '7': 'repeat(7, minmax(0, 1fr))',
        '8': 'repeat(8, minmax(0, 1fr))',
        '9': 'repeat(9, minmax(0, 1fr))',
        '10': 'repeat(10, minmax(0, 1fr))',
        '11': 'repeat(11, minmax(0, 1fr))',
        '12': 'repeat(12, minmax(0, 1fr))'
      }
    }
  },
  plugins: [
    require("tailwindcss-animate"),
    plugin(function({ addUtilities, theme }) {
      addUtilities({
        '.border-border': {
          borderColor: theme('colors.border')
        },
      })
    })
  ],
};

export default config;